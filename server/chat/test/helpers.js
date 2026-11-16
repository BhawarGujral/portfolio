import http from "node:http";
import { loadConfig } from "../src/config.js";
import { createGateway } from "../src/gateway.js";
import { silentLogger } from "../src/log.js";

export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export async function waitFor(check, { timeoutMs = 3000, stepMs = 10 } = {}) {
  const until = Date.now() + timeoutMs;
  while (Date.now() < until) {
    if (await check()) return;
    await sleep(stepMs);
  }
  throw new Error("waitFor timed out");
}

/** A gateway on a random port with tiny timeouts, pointed at `llamaUrl`. */
export async function startGateway(llamaUrl, { timeouts = {}, env = {}, ...overrides } = {}) {
  const config = loadConfig(
    // Tests use the public template, so they also pass on a fresh clone without the real file.
    // Saving chats is off unless a test opts in with its own temporary folder.
    { LLAMA_URL: llamaUrl, BATTERY_CMD: "", SYSTEM_PROMPT_PATH: "knowledge/about-bhawar.example.md", TRANSCRIPTS: "off", ...env },
    {
      timeouts: { healthPollMs: 20, healthTimeoutMs: 200, pingMs: 1000, warmupMs: 2000, ...timeouts },
      ...overrides,
    },
  );
  const gateway = createGateway(config, { log: silentLogger });
  const { port } = await gateway.listen(0, "127.0.0.1");
  return { gateway, config, url: `http://127.0.0.1:${port}` };
}

/** Wait until the model is online and the warm-up job has finished. */
export const untilOnline = (gateway) => waitFor(() => gateway.monitor.state() === "online" && !gateway.queue.busy);

/**
 * POST to the gateway with node:http (fetch won't let tests set Origin freely).
 * Resolves with { status, json } for plain responses or { status, events } for streams.
 * `onEvent(event, req)` sees each SSE event as it arrives; call req.destroy() to hang up.
 */
export function post(url, path, body, { origin = "http://localhost:5173", headers = {}, onEvent, raw } = {}) {
  return new Promise((resolve, reject) => {
    const payload = raw ?? JSON.stringify(body);
    const req = http.request(`${url}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(origin ? { Origin: origin } : {}),
        "CF-Connecting-IP": headers.ip ?? "203.0.113.7",
        ...headers,
      },
    });
    req.on("error", (err) => (req.destroyed ? resolve({ status: 0, events: [], aborted: true }) : reject(err)));
    req.on("response", (res) => {
      let buffer = "";
      const events = [];
      const isStream = (res.headers["content-type"] ?? "").startsWith("text/event-stream");
      res.setEncoding("utf8");
      res.on("data", (chunk) => {
        buffer += chunk;
        if (!isStream) return;
        let split;
        while ((split = buffer.indexOf("\n\n")) >= 0) {
          const frame = buffer.slice(0, split);
          buffer = buffer.slice(split + 2);
          const name = frame.match(/^event: (.+)$/m)?.[1];
          const data = frame.match(/^data: (.+)$/m)?.[1];
          if (!name) continue;
          const event = { event: name, data: JSON.parse(data) };
          events.push(event);
          onEvent?.(event, req);
        }
      });
      const finish = () =>
        resolve(
          isStream
            ? { status: res.statusCode, headers: res.headers, events }
            : { status: res.statusCode, headers: res.headers, json: buffer ? JSON.parse(buffer) : null },
        );
      res.on("end", finish);
      res.on("close", finish);
    });
    req.end(payload);
  });
}

export function get(url, path) {
  return new Promise((resolve, reject) => {
    http
      .get(`${url}${path}`, (res) => {
        let buffer = "";
        res.setEncoding("utf8");
        res.on("data", (c) => (buffer += c));
        res.on("end", () => resolve({ status: res.statusCode, headers: res.headers, json: JSON.parse(buffer) }));
      })
      .on("error", reject);
  });
}

export const ask = (text) => ({ messages: [{ role: "user", content: text }] });
export const textOf = (events) => events.filter((e) => e.event === "token").map((e) => e.data.text).join("");
export const names = (events) => events.map((e) => e.event);
