import { useCallback, useEffect, useRef, useState } from "react";
import { ChatError, streamChat, type ApiMessage, type ChatEvent } from "@/lib/pixel-chat";

export type MessageStatus = "queued" | "typing" | "streaming" | "done" | "stopped" | "error";

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  status: MessageStatus;
  queue?: { position: number; etaSec: number };
  meta?: { tokPerSec: number | null; ttftMs: number | null };
  error?: { code: string; message: string; retryable: boolean; discarded: boolean };
};

/** A short note shown above the composer, for refusals that aren't an answer. */
export type ChatNotice = { kind: "napping" | "busy" | "rate_limited"; message: string };

const STORAGE_KEY = "pixel-chat:v1";
const CONVERSATION_KEY = "pixel-chat:conversation";

// A random ID per chat, so the phone can group saved turns into conversations.
// It's new for every chat and says nothing about who the visitor is.
const newConversationId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `c${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;

function loadConversationId(): string {
  try {
    const saved = sessionStorage.getItem(CONVERSATION_KEY);
    if (saved) return saved;
    const fresh = newConversationId();
    sessionStorage.setItem(CONVERSATION_KEY, fresh);
    return fresh;
  } catch {
    return newConversationId();
  }
}

function saveConversationId(id: string) {
  try {
    sessionStorage.setItem(CONVERSATION_KEY, id);
  } catch {
    // ignore
  }
}
const MAX_HISTORY_PAIRS = 7; // + the new question = 15 messages, under the server's cap of 16

const NOTICE_TEXT: Record<ChatNotice["kind"], string> = {
  napping: "Pixel is napping. The phone is offline right now. Try again in a bit, or reach Bhawar via the Contact section.",
  busy: "The line is full right now. Give it a few seconds.",
  rate_limited: "That's a lot of questions! Take a short break and try again.",
};
const BLOCKED_TEXT = "I can't help with that one. Ask me something about Bhawar.";
const NOT_RETRYABLE = new Set(["output_blocked", "input_blocked", "bad_request", "message_too_long"]);

const newId = () => Math.random().toString(36).slice(2, 10);

// Only finished question/answer pairs survive a reload.
function loadSaved(): ChatMessage[] {
  try {
    const saved = JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? "[]") as ChatMessage[];
    const kept: ChatMessage[] = [];
    for (let i = 0; i + 1 < saved.length; i += 2) {
      const [question, answer] = [saved[i], saved[i + 1]];
      if (question?.role === "user" && answer?.role === "assistant" && answer.status === "done") {
        kept.push(question, answer);
      }
    }
    return kept;
  } catch {
    return [];
  }
}

function save(messages: ChatMessage[]) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
  } catch {
    // private mode or blocked storage: the chat just won't survive a reload
  }
}

/** Earlier turns sent with a new question: completed pairs only, newest last. */
function buildHistory(messages: ChatMessage[]): ApiMessage[] {
  const pairs: ApiMessage[][] = [];
  for (let i = 0; i + 1 < messages.length; i++) {
    const [question, answer] = [messages[i], messages[i + 1]];
    if (question.role !== "user" || answer.role !== "assistant") continue;
    const usable = answer.status === "done" || (answer.status === "stopped" && answer.content.trim() !== "");
    if (usable) {
      pairs.push([
        { role: "user", content: question.content },
        { role: "assistant", content: answer.content },
      ]);
    }
    i++;
  }
  return pairs.slice(-MAX_HISTORY_PAIRS).flat();
}

export function usePixelChat({
  onSettled,
  onRestoreDraft,
}: {
  onSettled?: () => void; // e.g. refresh the phone stats after each answer
  onRestoreDraft?: (text: string) => void; // put a refused question back in the composer
} = {}) {
  const [messages, setMessages] = useState<ChatMessage[]>(loadSaved);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<ChatNotice | null>(null);
  const conversationRef = useRef<string>(loadConversationId());
  const controllerRef = useRef<AbortController | null>(null);
  const callbacks = useRef({ onSettled, onRestoreDraft });
  callbacks.current = { onSettled, onRestoreDraft };

  useEffect(() => {
    if (!busy) save(messages);
  }, [messages, busy]);

  const patch = useCallback(
    (id: string, change: Partial<ChatMessage> | ((m: ChatMessage) => Partial<ChatMessage>)) =>
      setMessages((list) =>
        list.map((m) => (m.id === id ? { ...m, ...(typeof change === "function" ? change(m) : change) } : m)),
      ),
    [],
  );

  const ask = useCallback(
    async (text: string, base: ChatMessage[]) => {
      const question = text.trim();
      if (!question) return;
      const questionId = newId();
      const answerId = newId();
      const history = buildHistory(base);
      setNotice(null);
      setMessages([
        ...base,
        { id: questionId, role: "user", content: question, status: "done" },
        { id: answerId, role: "assistant", content: "", status: "typing" },
      ]);
      setBusy(true);
      const controller = new AbortController();
      controllerRef.current = controller;

      const onEvent = (event: ChatEvent) => {
        switch (event.event) {
          case "queue":
            patch(answerId, { status: "queued", queue: event.data });
            break;
          case "start":
            patch(answerId, { status: "typing", queue: undefined });
            break;
          case "token":
            patch(answerId, (m) => ({ status: "streaming", content: m.content + event.data.text }));
            break;
          case "done":
            patch(answerId, {
              status: "done",
              meta: { tokPerSec: event.data.timings.tokPerSec, ttftMs: event.data.timings.ttftMs },
            });
            break;
          case "error":
            patch(answerId, (m) => ({
              status: "error",
              content: event.data.discard ? "" : m.content,
              error: {
                code: event.data.code,
                message: event.data.message,
                retryable: !NOT_RETRYABLE.has(event.data.code),
                discarded: event.data.discard,
              },
            }));
            break;
        }
      };

      try {
        await streamChat([...history, { role: "user", content: question }], {
          signal: controller.signal,
          onEvent,
          conversationId: conversationRef.current,
        });
        // The stream closed without saying it was done: the connection dropped.
        patch(answerId, (m) =>
          m.status === "done" || m.status === "error"
            ? {}
            : {
                status: "error",
                error: { code: "dropped", message: "The connection dropped.", retryable: true, discarded: false },
              },
        );
      } catch (err) {
        if (controller.signal.aborted) {
          patch(answerId, { status: "stopped", queue: undefined });
        } else if (err instanceof ChatError && (err.code === "napping" || err.code === "busy" || err.code === "rate_limited")) {
          // About the phone, not this question: take the question back and explain.
          setMessages((list) => list.filter((m) => m.id !== questionId && m.id !== answerId));
          setNotice({ kind: err.code, message: NOTICE_TEXT[err.code] });
          callbacks.current.onRestoreDraft?.(question);
        } else if (err instanceof ChatError && err.code === "input_blocked") {
          patch(answerId, {
            status: "error",
            error: { code: err.code, message: BLOCKED_TEXT, retryable: false, discarded: true },
          });
        } else {
          patch(answerId, {
            status: "error",
            error: {
              code: err instanceof ChatError ? err.code : "internal",
              message: err instanceof ChatError ? err.message : "Something went wrong.",
              retryable: true,
              discarded: false,
            },
          });
        }
      } finally {
        controllerRef.current = null;
        setBusy(false);
        callbacks.current.onSettled?.();
      }
    },
    [patch],
  );

  const send = useCallback(
    (text: string) => {
      if (!busy) void ask(text, messages);
    },
    [ask, busy, messages],
  );

  /** Re-ask the question behind a failed or stopped answer. */
  const retry = useCallback(
    (answerId: string) => {
      if (busy) return;
      const index = messages.findIndex((m) => m.id === answerId);
      const question = messages[index - 1];
      if (index < 1 || question?.role !== "user") return;
      void ask(question.content, messages.slice(0, index - 1));
    },
    [ask, busy, messages],
  );

  const stop = useCallback(() => controllerRef.current?.abort(), []);

  const reset = useCallback(() => {
    controllerRef.current?.abort();
    setMessages([]);
    setNotice(null);
    conversationRef.current = newConversationId();
    saveConversationId(conversationRef.current);
  }, []);

  const dismissNotice = useCallback(() => setNotice(null), []);

  useEffect(() => () => controllerRef.current?.abort(), []);

  return { messages, busy, notice, send, retry, stop, reset, dismissNotice };
}
