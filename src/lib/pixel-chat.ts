// Client for the "Ask Pixel" chat API. The chat runs on a Pixel 7 at home and
// is reached through Cloudflare Tunnel at api.bhawargujral.com.
const API_BASE: string = import.meta.env.VITE_CHAT_API ?? "https://api.bhawargujral.com";

export type ChatRole = "user" | "assistant";
export type ApiMessage = { role: ChatRole; content: string };

export type PixelState = "online" | "warming" | "loading" | "offline" | "too_hot";

export type PixelStatus = {
  online: boolean;
  state: PixelState;
  model: { name: string; quant: string; device: string };
  tokPerSec: number | null;
  queue: { active: number; waiting: number; max: number };
  battery: { percentage: number; temperatureC: number; plugged: boolean | null; ageSec: number } | null;
  uptimeSec: number;
  answersServed: number;
  limits: { maxMessageChars: number; maxMessages: number };
};

export type DoneTimings = { queuedMs: number; ttftMs: number | null; genMs: number; tokPerSec: number | null };

export type ChatEvent =
  | { event: "queue"; data: { position: number; etaSec: number } }
  | { event: "start"; data: { id: string; model: string; queuedMs: number; historyTrimmed: boolean } }
  | { event: "token"; data: { text: string } }
  | { event: "done"; data: { finishReason: "stop" | "length"; timings: DoneTimings } }
  | { event: "error"; data: { code: string; message: string; discard: boolean } };

export class ChatError extends Error {
  readonly code: string;
  readonly reason?: string;
  readonly retryAfterSec?: number;
  constructor(code: string, message: string, reason?: string, retryAfterSec?: number) {
    super(message);
    this.code = code;
    this.reason = reason;
    this.retryAfterSec = retryAfterSec;
  }
}

export const MAX_MESSAGE_CHARS = 500;

export async function fetchStatus(signal?: AbortSignal): Promise<PixelStatus> {
  const res = await fetch(`${API_BASE}/api/chat/status`, { signal });
  if (!res.ok) throw new ChatError("internal", "Status unavailable");
  return res.json();
}

export async function fetchSuggestions(signal?: AbortSignal): Promise<string[]> {
  const res = await fetch(`${API_BASE}/api/chat/suggestions`, { signal });
  if (!res.ok) throw new ChatError("internal", "Suggestions unavailable");
  return (await res.json()).suggestions;
}

const UNREACHABLE =
  "I can't reach Pixel right now. The phone might be napping, so please try again in a bit.";

/**
 * Sends the conversation and calls `onEvent` for each streamed event.
 * Throws ChatError for refusals before the answer starts (napping, busy, ...).
 * Rejects with an AbortError if `signal` is aborted (the visitor pressed stop).
 */
export async function streamChat(
  messages: ApiMessage[],
  {
    signal,
    onEvent,
    conversationId,
  }: { signal?: AbortSignal; onEvent: (event: ChatEvent) => void; conversationId?: string },
): Promise<void> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages, conversationId, website: "" }),
      signal,
    });
  } catch (err) {
    if (signal?.aborted) throw err;
    throw new ChatError("napping", UNREACHABLE, "unreachable");
  }

  if (!(res.headers.get("content-type") ?? "").startsWith("text/event-stream")) {
    const body = await res.json().catch(() => ({}));
    const error = body?.error ?? {};
    throw new ChatError(
      error.code ?? "internal",
      error.message ?? UNREACHABLE,
      error.reason,
      error.retryAfterSec,
    );
  }

  const reader = res.body!.pipeThrough(new TextDecoderStream()).getReader();
  let buffer = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += value;
    let split: number;
    while ((split = buffer.indexOf("\n\n")) >= 0) {
      const frame = buffer.slice(0, split);
      buffer = buffer.slice(split + 2);
      const name = frame.match(/^event: (.+)$/m)?.[1];
      const data = frame.match(/^data: (.+)$/m)?.[1];
      if (!name || !data) continue; // keep-alive comments
      onEvent({ event: name, data: JSON.parse(data) } as ChatEvent);
    }
  }
}
