export class UpstreamError extends Error {
  /** @param {"napping" | "internal"} code  @param {string} reason */
  constructor(code, reason) {
    super(reason);
    this.code = code;
    this.reason = reason;
  }
}

/** Client for llama.cpp's llama-server running on the phone. */
export function createLlamaClient({ baseUrl, fetch = globalThis.fetch }) {
  /** @returns {Promise<"online" | "loading" | "offline">} */
  async function checkHealth(timeoutMs) {
    try {
      const res = await fetch(`${baseUrl}/health`, { signal: AbortSignal.timeout(timeoutMs) });
      await res.body?.cancel();
      if (res.ok) return "online";
      return res.status === 503 ? "loading" : "offline";
    } catch {
      return "offline";
    }
  }

  async function tokenize(content, timeoutMs = 10_000) {
    const res = await fetch(`${baseUrl}/tokenize`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!res.ok) throw new UpstreamError("internal", `tokenize returned ${res.status}`);
    const { tokens } = await res.json();
    return tokens.length;
  }

  /**
   * Streams one answer. `onDelta` receives visible text only; Gemma's hidden
   * "thinking" (reasoning_content) is never forwarded.
   */
  async function streamCompletion({ messages, maxTokens, signal, onDelta, temperature = 0.6 }) {
    let res;
    try {
      res = await fetch(`${baseUrl}/v1/chat/completions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages,
          stream: true,
          max_tokens: maxTokens,
          temperature,
          top_p: 0.95,
          cache_prompt: true,
          stream_options: { include_usage: true },
          chat_template_kwargs: { enable_thinking: false },
        }),
        signal,
      });
    } catch (err) {
      if (signal?.aborted) throw err;
      throw new UpstreamError("napping", "model_offline");
    }
    if (res.status === 503) {
      await res.body?.cancel();
      throw new UpstreamError("napping", "model_loading");
    }
    if (!res.ok) {
      await res.body?.cancel();
      throw new UpstreamError("internal", `upstream returned ${res.status}`);
    }

    try {
      return await readStream(res.body, onDelta);
    } catch (err) {
      if (signal?.aborted || err instanceof UpstreamError) throw err;
      // The connection dropped mid-answer: llama-server crashed or was restarted.
      throw new UpstreamError("napping", "stream_interrupted");
    }
  }

  async function readStream(body, onDelta) {
    const result = { finishReason: null, timings: null, usage: null };
    const decoder = new TextDecoder();
    let buffer = "";
    for await (const chunk of body) {
      buffer += decoder.decode(chunk, { stream: true });
      let newline;
      while ((newline = buffer.indexOf("\n")) >= 0) {
        const line = buffer.slice(0, newline).replace(/\r$/, "");
        buffer = buffer.slice(newline + 1);
        if (!line.startsWith("data:")) continue;
        const data = line.slice(5).trim();
        if (data === "[DONE]") return result;

        let payload;
        try {
          payload = JSON.parse(data);
        } catch {
          continue;
        }
        if (payload.error) throw new UpstreamError("internal", "upstream sent an error");
        const choice = payload.choices?.[0];
        if (choice?.delta?.content) onDelta(choice.delta.content);
        if (choice?.finish_reason) result.finishReason = choice.finish_reason;
        if (payload.timings) result.timings = payload.timings;
        if (payload.usage) result.usage = payload.usage;
      }
    }
    return result;
  }

  return { checkHealth, tokenize, streamCompletion };
}
