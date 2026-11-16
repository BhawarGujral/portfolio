import { isProfaneProse } from "./filter.js";

// Gemma 4 chat-template tokens (<|turn>, <turn|>, <|channel>, <|think|>, ...) plus
// older Gemma/llama ones. llama.cpp would treat these as real control tokens if
// they appeared inside a message, letting a visitor fake a system turn.
const TEMPLATE_TOKENS =
  /<\|[a-z_]{1,30}\|?>|<[a-z_]{1,30}\|>|<\/?(?:bos|eos|pad|unk|mask|start_of_turn|end_of_turn)>/gi;

// Control characters (except newline), zero-width and bidi-override characters.
const INVISIBLE =
  /[\u0000-\u0009\u000B-\u001F\u007F-\u009F​-‏‪-‮⁠-⁩﻿]/g;

export function sanitizeText(value) {
  if (typeof value !== "string") return "";
  let text = value.normalize("NFC").replace(INVISIBLE, "");
  let previous;
  do {
    previous = text;
    text = text.replace(TEMPLATE_TOKENS, "");
  } while (text !== previous);
  return text.replace(/\n{3,}/g, "\n\n").trim();
}

const fail = (code, message) => ({ ok: false, code, message });

/**
 * Checks the visitor's conversation. Only "user" and "assistant" turns are
 * accepted, alternating and ending with the visitor's new question. The
 * system prompt is always added by the server, never by the browser.
 */
export function validateChatBody(body, { maxMessages, maxMessageChars, maxAssistantChars }) {
  if (!body || typeof body !== "object" || !Array.isArray(body.messages)) {
    return fail("bad_request", "Send a messages array.");
  }
  const { messages } = body;
  if (messages.length < 1 || messages.length > maxMessages) {
    return fail("bad_request", `Send between 1 and ${maxMessages} messages.`);
  }
  if (messages.length % 2 === 0) {
    return fail("bad_request", "The conversation must end with your question.");
  }

  const clean = [];
  for (const [i, item] of messages.entries()) {
    const expectedRole = i % 2 === 0 ? "user" : "assistant";
    if (!item || typeof item !== "object" || item.role !== expectedRole) {
      return fail("bad_request", "Messages must alternate between user and assistant.");
    }
    if (typeof item.content !== "string") {
      return fail("bad_request", "Each message needs text content.");
    }
    let content = sanitizeText(item.content);
    if (!content) return fail("bad_request", "Please type a message.");

    if (expectedRole === "user" && [...content].length > maxMessageChars) {
      return fail("message_too_long", `Please keep messages under ${maxMessageChars} characters.`);
    }
    if (expectedRole === "assistant" && [...content].length > maxAssistantChars) {
      content = [...content].slice(0, maxAssistantChars).join("");
    }
    // Assistant turns come from the browser too, so they're untrusted as well.
    if (isProfaneProse(content)) {
      return fail("input_blocked", "Let's keep it friendly. Try rephrasing that.");
    }
    clean.push({ role: expectedRole, content });
  }
  return { ok: true, messages: clean };
}
