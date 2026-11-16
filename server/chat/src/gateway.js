import http from "node:http";
import { createLlamaClient } from "./llama.js";
import { JobQueue } from "./queue.js";
import { createRateLimiter } from "./ratelimit.js";
import { createMonitor } from "./monitor.js";
import { createChatHandler, HttpError } from "./chat-handler.js";
import { estimateTokens, historyBudget } from "./history.js";
import { createLogger } from "./log.js";
import { createTranscriptStore } from "./transcripts.js";

const JSON_HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
};

function send(res, status, body, headers = {}) {
  res.writeHead(status, { ...JSON_HEADERS, ...headers });
  res.end(body === undefined ? undefined : JSON.stringify(body));
}

function sendError(res, err) {
  const { retryAfterSec, ...extra } = err.extra ?? {};
  const headers = retryAfterSec ? { "Retry-After": String(retryAfterSec) } : {};
  send(res, err.status, { error: { code: err.code, message: err.message, ...extra, ...(retryAfterSec ? { retryAfterSec } : {}) } }, headers);
}

// Behind Cloudflare Tunnel every request comes from localhost; Cloudflare puts
// the visitor's real address in CF-Connecting-IP.
const clientIp = (req) =>
  req.headers["cf-connecting-ip"]?.toString() ?? req.socket.remoteAddress ?? "unknown";

function readJson(req, maxBytes, timeoutMs) {
  return new Promise((resolve, reject) => {
    let size = 0;
    let tooLarge = false;
    const chunks = [];
    const timer = setTimeout(() => {
      reject(new HttpError(408, "bad_request", "The request took too long to arrive."));
      req.destroy();
    }, timeoutMs);
    req.on("data", (chunk) => {
      if (tooLarge) return; // keep draining so we can still answer with a 413
      size += chunk.length;
      if (size > maxBytes) {
        tooLarge = true;
        clearTimeout(timer);
        reject(new HttpError(413, "too_large", "That message is too large."));
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => {
      clearTimeout(timer);
      if (tooLarge) return;
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}"));
      } catch {
        reject(new HttpError(400, "bad_request", "That wasn't valid JSON."));
      }
    });
    req.on("error", (err) => {
      clearTimeout(timer);
      reject(err);
    });
  });
}

/**
 * The chat gateway: the only thing on the phone the internet can reach for
 * chat. It owns the system prompt, the queue, the limits and the filters, and
 * talks to llama-server on localhost.
 */
export function createGateway(config, deps = {}) {
  const now = deps.now ?? Date.now;
  const log = deps.log ?? createLogger();
  const llama = createLlamaClient({ baseUrl: config.llamaUrl, fetch: deps.fetch });
  const queue = new JobQueue({ max: config.queueMax });
  const limiter = createRateLimiter({ limits: config.limits, now });
  const transcripts = config.transcripts.enabled
    ? createTranscriptStore({
        dir: config.transcripts.dir,
        retentionDays: config.transcripts.retentionDays,
        now,
        onError: () => log({ ev: "transcript", outcome: "write_failed" }),
      })
    : null;

  let budget = historyBudget(config, estimateTokens(config.systemPrompt));
  if (budget < 300) {
    throw new Error("The system prompt is too long for the model's context window.");
  }

  // Ask the model how many tokens the system prompt really is (the estimate is pessimistic).
  async function refreshBudget() {
    try {
      const systemTokens = await llama.tokenize(config.systemPrompt);
      budget = Math.max(historyBudget(config, systemTokens), 300);
      log({ ev: "budget", systemTokens, budget });
    } catch {
      // keep the estimate
    }
  }

  // After the model (re)starts, process the system prompt once so the first
  // real visitor doesn't wait ~30 s for it.
  let warmingUp = null;
  function warmUp() {
    if (warmingUp) return warmingUp;
    warmingUp = (async () => {
      monitor.setWarming(true);
      const handle = queue.enqueue({ front: true });
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), config.timeouts.warmupMs);
      try {
        await handle.granted;
        await llama.streamCompletion({
          messages: [
            { role: "system", content: config.systemPrompt },
            { role: "user", content: "hi" },
          ],
          maxTokens: 1,
          signal: controller.signal,
          onDelta: () => {},
        });
        log({ ev: "warmup", outcome: "ok" });
      } catch {
        log({ ev: "warmup", outcome: "failed" });
      } finally {
        clearTimeout(timer);
        handle.cancel();
        monitor.setWarming(false);
        warmingUp = null;
      }
    })();
    return warmingUp;
  }

  const monitor = createMonitor({
    config,
    llama,
    log,
    now,
    execFile: deps.execFile,
    isBusy: () => queue.busy,
    onOnline: () => {
      monitor.setWarming(true); // before any await, so no visitor slips in ahead of the warm-up
      refreshBudget().finally(warmUp);
    },
  });

  const handleChat = createChatHandler({
    config,
    queue,
    limiter,
    llama,
    monitor,
    log,
    now,
    transcripts,
    getHistoryBudget: () => budget,
  });

  async function purgeTranscripts() {
    if (!transcripts) return;
    try {
      const removed = await transcripts.purge();
      if (removed) log({ ev: "transcript", outcome: "purged", reason: `${removed} day files` });
    } catch {
      log({ ev: "transcript", outcome: "purge_failed" });
    }
  }

  let statusCache = null;
  function status() {
    const t = now();
    if (statusCache && t - statusCache.at < config.timeouts.statusCacheMs) return statusCache.body;
    const snap = monitor.snapshot();
    const body = {
      online: snap.state === "online" || snap.state === "warming",
      state: snap.state,
      model: { ...config.model },
      tokPerSec: snap.tokPerSec,
      queue: { active: queue.busy ? 1 : 0, waiting: queue.waitingCount, max: queue.max },
      battery: snap.battery,
      uptimeSec: snap.uptimeSec,
      answersServed: snap.answersServed,
      limits: { maxMessageChars: config.maxMessageChars, maxMessages: config.maxMessages },
    };
    statusCache = { at: t, body };
    return body;
  }

  function applyCors(req, res) {
    const origin = req.headers.origin;
    res.setHeader("Vary", "Origin");
    if (origin && config.allowedOrigins.has(origin)) {
      res.setHeader("Access-Control-Allow-Origin", origin);
      res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type");
      res.setHeader("Access-Control-Max-Age", "86400");
      return true;
    }
    return false;
  }

  const server = http.createServer(async (req, res) => {
    const { pathname } = new URL(req.url ?? "/", "http://localhost");
    try {
      const originAllowed = applyCors(req, res);
      if (req.method === "OPTIONS") return send(res, 204);

      if (pathname === "/health" || pathname === "/api/chat/health") {
        if (req.method !== "GET") throw new HttpError(405, "method_not_allowed", "Use GET.");
        return send(res, 200, { ok: true, llama: monitor.llamaState });
      }
      if (pathname === "/api/chat/status") {
        if (req.method !== "GET") throw new HttpError(405, "method_not_allowed", "Use GET.");
        return send(res, 200, status());
      }
      if (pathname === "/api/chat/suggestions") {
        if (req.method !== "GET") throw new HttpError(405, "method_not_allowed", "Use GET.");
        return send(res, 200, { suggestions: config.suggestions }, { "Cache-Control": "public, max-age=3600" });
      }
      if (pathname === "/api/chat") {
        if (req.method !== "POST") throw new HttpError(405, "method_not_allowed", "Use POST.");
        if (!originAllowed) throw new HttpError(403, "origin_not_allowed", "Chat is only available on bhawargujral.com.");
        const type = (req.headers["content-type"] ?? "").toLowerCase();
        if (!type.startsWith("application/json")) {
          throw new HttpError(415, "unsupported_media_type", "Send JSON.");
        }
        const body = await readJson(req, config.maxBodyBytes, config.timeouts.bodyMs);
        return await handleChat(res, body, clientIp(req));
      }
      throw new HttpError(404, "not_found", "Not found.");
    } catch (err) {
      if (res.headersSent) {
        if (!res.writableEnded) res.end();
        return;
      }
      if (err instanceof HttpError) return sendError(res, err);
      console.error("[chat] unexpected error:", err?.message ?? err);
      return sendError(res, new HttpError(500, "internal", "Something went wrong."));
    }
  });

  let sweepTimer = null;
  let purgeTimer = null;

  return {
    server,
    monitor,
    queue,
    transcripts,
    listen(port = config.port, host = config.host) {
      return new Promise((resolve) => {
        server.listen(port, host, () => {
          monitor.start();
          sweepTimer = setInterval(() => limiter.sweep(), 60_000).unref();
          purgeTranscripts();
          purgeTimer = setInterval(purgeTranscripts, 6 * 60 * 60 * 1000).unref();
          const address = server.address();
          log({ ev: "listening", host: address.address, port: address.port });
          resolve(address);
        });
      });
    },
    async close() {
      monitor.stop();
      clearInterval(sweepTimer);
      clearInterval(purgeTimer);
      await transcripts?.flush();
      server.closeAllConnections();
      await new Promise((resolve) => server.close(resolve));
    },
  };
}
