import { randomBytes } from "node:crypto";
import { openSse } from "./sse.js";
import { sanitizeText, validateChatBody } from "./validate.js";
import { trimHistory } from "./history.js";
import { QueueFullError, CancelledError } from "./queue.js";
import { UpstreamError } from "./llama.js";
import { createStreamFilter } from "./filter.js";

export class HttpError extends Error {
  constructor(status, code, message, extra = {}) {
    super(message);
    this.status = status;
    this.code = code;
    this.extra = extra;
  }
}

const NAP = {
  offline: {
    reason: "model_offline",
    message: "Pixel is napping right now 💤 The phone is offline, so please try again in a bit.",
    retryAfterSec: 30,
  },
  loading: {
    reason: "model_loading",
    message: "Pixel is waking up. Give it a few seconds and try again.",
    retryAfterSec: 30,
  },
  too_hot: {
    reason: "too_hot",
    message: "The phone is running a little warm, so Pixel is taking a short break to cool down.",
    retryAfterSec: 300,
  },
};

const napping = (state) =>
  new HttpError(503, "napping", NAP[state].message, {
    reason: NAP[state].reason,
    retryAfterSec: NAP[state].retryAfterSec,
  });

const busy = () =>
  new HttpError(503, "busy", "Lots of people are chatting with the phone right now. Please try again in a minute.", {
    retryAfterSec: 60,
  });

const MESSAGES = {
  output_blocked: "I got a bit tongue-tied there. Could you ask that another way?",
  upstream_timeout: "The phone took too long to answer. Please try again.",
  queue_timeout: "The line was too long this time. Please try again in a minute.",
  napping: NAP.offline.message,
  internal: "Something went wrong on the phone. Please try again.",
};

const round1 = (n) => Math.round(n * 10) / 10;

// The website sends a random ID per chat so saved turns can be grouped into
// conversations. It identifies the chat, not the visitor.
const CONVERSATION_ID = /^[A-Za-z0-9_-]{8,64}$/;

/** The POST /api/chat pipeline: validate, rate-limit, queue, then stream. */
export function createChatHandler({ config, queue, limiter, llama, monitor, log, now, transcripts, getHistoryBudget }) {
  const model = `${config.model.name} (${config.model.quant})`;
  const recentJobSec = [];
  const meanJobSec = () =>
    recentJobSec.length ? recentJobSec.reduce((a, b) => a + b, 0) / recentJobSec.length : 30;

  function honeypot(res) {
    const sse = openSse(res, now);
    sse.event("start", { id: "00000000", model: `${config.model.name} (${config.model.quant})`, queuedMs: 0, historyTrimmed: false });
    sse.event("token", { text: "Thanks for stopping by!" });
    sse.event("done", { finishReason: "stop", usage: { promptTokens: 0, completionTokens: 4 }, timings: { queuedMs: 0, ttftMs: 0, genMs: 0, tokPerSec: null } });
    sse.close();
  }

  async function handleChat(res, body, ip) {
    // Bots that fill the hidden "website" field get a polite canned reply.
    if (typeof body?.website === "string" && body.website.trim() !== "") return honeypot(res);

    const conversationId =
      typeof body?.conversationId === "string" && CONVERSATION_ID.test(body.conversationId)
        ? body.conversationId
        : null;
    const checked = validateChatBody(body, config);
    if (!checked.ok) {
      // Keep rude questions for review too, but count them against the rate
      // limit so nobody can fill the phone's storage by spamming them.
      if (checked.code === "input_blocked" && transcripts) {
        const key = limiter.key(ip);
        if (!limiter.check(key)) {
          limiter.record(key);
          const question = sanitizeText(body.messages.at(-1)?.content);
          transcripts.record({ conversationId, turn: Math.ceil(body.messages.length / 2), question, outcome: "input_blocked", model });
        }
      }
      throw new HttpError(400, checked.code, checked.message);
    }

    const state = monitor.state();
    if (NAP[state]) throw napping(state);

    const key = limiter.key(ip);
    if (queue.hasKey(key)) {
      throw new HttpError(429, "already_in_progress", "Pixel is still working on your last question.");
    }
    const limited = limiter.check(key);
    if (limited?.code === "busy") throw busy();
    if (limited) {
      throw new HttpError(429, "rate_limited", "You're chatting faster than the phone can keep up. Take a short break and try again.", {
        retryAfterSec: limited.retryAfterSec,
      });
    }

    const { messages, trimmed } = trimHistory(checked.messages, getHistoryBudget());
    let handle;
    try {
      handle = queue.enqueue({ key });
    } catch (err) {
      if (err instanceof QueueFullError) throw busy();
      throw err;
    }
    limiter.record(key);
    const turn = {
      conversationId,
      turn: Math.ceil(checked.messages.length / 2),
      question: checked.messages.at(-1).content,
    };
    await stream(res, handle, messages, trimmed, turn);
  }

  async function stream(res, handle, messages, trimmed, turn) {
    const id = randomBytes(4).toString("hex");
    const acceptedAt = now();
    const sse = openSse(res, now);
    const upstream = new AbortController();
    const timers = new Set();
    const later = (fn, ms) => {
      const timer = setTimeout(fn, ms);
      timers.add(timer);
      return timer;
    };
    const clear = (timer) => {
      if (!timer) return;
      clearTimeout(timer);
      timers.delete(timer);
    };

    let abortReason = null;
    const abort = (reason) => {
      if (abortReason) return;
      abortReason = reason;
      upstream.abort();
    };

    let finished = false;
    res.on("close", () => {
      if (finished) return;
      abort("client");
      handle.cancel(); // frees the slot (or the place in line) right away
    });

    // Keep the connection alive through Cloudflare while waiting or thinking.
    const pingEvery = Math.max(100, Math.floor(config.timeouts.pingMs / 3));
    const ping = setInterval(() => {
      if (sse.idleMs() >= config.timeouts.pingMs) sse.comment();
    }, pingEvery);

    const eta = (position) => Math.max(1, Math.round((position + (queue.busy ? 1 : 0)) * meanJobSec()));
    if (handle.position > 0) sse.event("queue", { position: handle.position, etaSec: eta(handle.position) });
    handle.onPosition((position) => sse.event("queue", { position, etaSec: eta(position) }));

    const stats = { outcome: "internal", queuedMs: 0, ttftMs: null, genMs: 0, promptN: null, predictedN: 0, tps: null };
    let answer = ""; // exactly what the visitor saw
    let finishReason = null;
    const sendToken = (text) => {
      answer += text;
      sse.event("token", { text });
    };
    const sendError = (code, discard = false) => {
      if (discard) answer = "";
      sse.event("error", { code, message: MESSAGES[code], discard });
    };

    try {
      let queueTimer;
      const queueTimeout = new Promise((_, reject) => {
        queueTimer = later(() => reject(new HttpError(0, "queue_timeout", MESSAGES.queue_timeout)), config.timeouts.queueMs);
      });
      try {
        await Promise.race([handle.granted, queueTimeout]);
      } finally {
        clear(queueTimer);
      }

      stats.queuedMs = now() - acceptedAt;
      const state = monitor.state();
      if (state === "offline" || state === "loading") throw new UpstreamError("napping", state);

      sse.event("start", {
        id,
        model: `${config.model.name} (${config.model.quant})`,
        queuedMs: stats.queuedMs,
        historyTrimmed: trimmed,
      });

      const filter = createStreamFilter();
      const startedAt = now();
      let deltas = 0;
      let gapTimer = null;
      const firstTokenTimer = later(() => abort("first_token"), config.timeouts.firstTokenMs);
      const totalTimer = later(() => abort("total"), config.timeouts.totalMs);

      const onDelta = (text) => {
        if (abortReason) return;
        deltas += 1;
        if (stats.ttftMs === null) {
          stats.ttftMs = now() - startedAt;
          clear(firstTokenTimer);
        }
        clear(gapTimer);
        gapTimer = later(() => abort("gap"), config.timeouts.gapMs);
        const { emit, blocked } = filter.push(text);
        if (blocked) return abort("blocked");
        if (emit) sendToken(emit);
      };

      let result = { finishReason: "stop", timings: null, usage: null };
      try {
        result = await llama.streamCompletion({
          messages: [{ role: "system", content: config.systemPrompt }, ...messages],
          maxTokens: config.maxReplyTokens,
          signal: upstream.signal,
          onDelta,
        });
      } catch (err) {
        if (!abortReason) throw err; // a real failure, not one of our own aborts
      } finally {
        clear(firstTokenTimer);
        clear(totalTimer);
        clear(gapTimer);
      }
      stats.genMs = now() - startedAt;

      if (abortReason === "client") {
        stats.outcome = "client_left";
        return;
      }
      if (abortReason === "blocked") {
        stats.outcome = "blocked";
        return sendError("output_blocked", true);
      }
      if (abortReason === "first_token" || abortReason === "gap") {
        stats.outcome = "timeout";
        return sendError("upstream_timeout");
      }

      const rest = filter.flush();
      if (rest.blocked) {
        stats.outcome = "blocked";
        return sendError("output_blocked", true);
      }
      if (rest.emit) sendToken(rest.emit);

      const { timings, usage } = result;
      const writingMs = stats.genMs - (stats.ttftMs ?? 0);
      const tokPerSec =
        timings?.predicted_per_second ?? (deltas > 1 && writingMs > 0 ? deltas / (writingMs / 1000) : null);
      stats.tps = tokPerSec ? round1(tokPerSec) : null;
      stats.promptN = usage?.prompt_tokens ?? timings?.prompt_n ?? null;
      stats.predictedN = usage?.completion_tokens ?? timings?.predicted_n ?? deltas;

      finishReason = abortReason === "total" || result.finishReason === "length" ? "length" : "stop";
      sse.event("done", {
        finishReason,
        usage: { promptTokens: stats.promptN, completionTokens: stats.predictedN },
        timings: { queuedMs: stats.queuedMs, ttftMs: stats.ttftMs, genMs: stats.genMs, tokPerSec: stats.tps },
      });
      stats.outcome = "ok";
      monitor.recordAnswer(stats.tps);
      recentJobSec.push(stats.genMs / 1000);
      if (recentJobSec.length > 10) recentJobSec.shift();
    } catch (err) {
      if (err instanceof CancelledError) {
        stats.outcome = "client_left";
      } else if (err instanceof HttpError && err.code === "queue_timeout") {
        stats.outcome = "queue_timeout";
        sendError("queue_timeout");
      } else if (err instanceof UpstreamError && err.code === "napping") {
        stats.outcome = "napping";
        monitor.markOffline();
        sendError("napping");
      } else {
        stats.outcome = "internal";
        console.error("[chat] unexpected error:", err?.message ?? err);
        sendError("internal");
      }
    } finally {
      finished = true;
      clearInterval(ping);
      timers.forEach(clearTimeout);
      timers.clear();
      handle.cancel(); // no-op if already released
      sse.close();
      log({ ev: "chat", id, trimmed, ...stats });
      transcripts?.record({
        ...turn,
        answer,
        outcome: stats.outcome,
        finishReason,
        historyTrimmed: trimmed,
        model,
        timings: { queuedMs: stats.queuedMs, ttftMs: stats.ttftMs, genMs: stats.genMs, tokPerSec: stats.tps },
        tokens: { prompt: stats.promptN, completion: stats.predictedN },
      });
    }
  }

  return handleChat;
}
