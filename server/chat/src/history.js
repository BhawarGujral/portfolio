// A deliberately pessimistic token estimate: English averages ~4 characters
// per token, we assume 3; anything non-ASCII (Hindi, emoji) counts 1 each.
export function estimateTokens(text) {
  let ascii = 0;
  let other = 0;
  for (const ch of text) {
    if (ch.codePointAt(0) < 128) ascii += 1;
    else other += 1;
  }
  return Math.ceil(ascii / 3 + other) + 6; // + per-message template overhead
}

/**
 * Keeps the newest question plus as many earlier question/answer pairs as fit
 * in `budget` tokens, dropping the oldest first.
 */
export function trimHistory(messages, budget) {
  const last = messages[messages.length - 1];
  const kept = [last];
  let used = estimateTokens(last.content);

  for (let i = messages.length - 2; i >= 1; i -= 2) {
    const question = messages[i - 1];
    const answer = messages[i];
    const cost = estimateTokens(question.content) + estimateTokens(answer.content);
    if (used + cost > budget) break;
    kept.unshift(question, answer);
    used += cost;
  }
  return { messages: kept, trimmed: kept.length < messages.length, tokens: used };
}

/** Tokens left for history once the system prompt and the reply are reserved. */
export function historyBudget({ ctxSize, maxReplyTokens }, systemTokens) {
  return Math.min(ctxSize - systemTokens - maxReplyTokens - 150, 1800);
}
