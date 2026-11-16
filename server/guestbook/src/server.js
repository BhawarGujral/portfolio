import http from "node:http";
import { fileURLToPath } from "node:url";
import { openDb } from "./db.js";
import { validateName } from "./validate.js";

const PORT = Number(process.env.PORT ?? 8787);
// Listen on localhost only: the public reaches this through Cloudflare Tunnel,
// never directly, so nothing on the Wi-Fi or the internet can bypass it.
const HOST = process.env.HOST ?? "127.0.0.1";
const DB_PATH =
  process.env.DB_PATH ?? fileURLToPath(new URL("../data/guestbook.db", import.meta.url));
const ALLOWED_ORIGINS = new Set(
  (process.env.ALLOWED_ORIGINS ??
    "https://bhawargujral.com,https://www.bhawargujral.com,http://localhost:5173")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
);

const LIST_LIMIT = 2000; // the wall shows everyone; ~110 bytes each
const MAX_BODY_BYTES = 1024;
const PER_IP_COOLDOWN_MS = 30 * 1000;
const PER_IP_PER_DAY = 5;
const GLOBAL_PER_HOUR = 200;

export const STICKERS = [
  "star", "heart", "rocket", "sparkles", "sun", "moon",
  "flower", "coffee", "zap", "music", "smile", "cat",
];
const HUES = [0, 25, 45, 95, 150, 190, 215, 260, 290, 330];
const pick = (list) => list[Math.floor(Math.random() * list.length)];

const db = openDb(DB_PATH);

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function send(res, status, body) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
  });
  res.end(body === undefined ? undefined : JSON.stringify(body));
}

function applyCors(req, res) {
  const origin = req.headers.origin;
  res.setHeader("Vary", "Origin");
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    res.setHeader("Access-Control-Max-Age", "86400");
  }
  return !origin || ALLOWED_ORIGINS.has(origin);
}

// Behind Cloudflare Tunnel every request arrives from localhost, and Cloudflare
// puts the visitor's real address in CF-Connecting-IP.
const clientIp = (req) =>
  req.headers["cf-connecting-ip"]?.toString() ?? req.socket.remoteAddress ?? "unknown";

function readJson(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    let tooLarge = false;
    const chunks = [];
    req.on("data", (chunk) => {
      if (tooLarge) return; // keep draining so we can still reply with a 413
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        tooLarge = true;
        reject(new HttpError(413, "Request too large."));
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => {
      if (tooLarge) return;
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}"));
      } catch {
        reject(new HttpError(400, "Invalid JSON."));
      }
    });
    req.on("error", reject);
  });
}

function listSignatures() {
  return { count: db.count(), entries: db.list(LIST_LIMIT) };
}

async function sign(req) {
  const body = await readJson(req);

  // Honeypot: a hidden field real visitors never see. Bots that fill it get a
  // fake success so they don't learn they were caught.
  if (typeof body.website === "string" && body.website.trim() !== "") {
    return { id: 0, name: "Thanks!", sticker: "sparkles", hue: 45, createdAt: new Date().toISOString(), x: 0, y: 0, r: 0 };
  }

  const result = validateName(body.name);
  if (!result.ok) throw new HttpError(400, result.error);

  const now = Date.now();
  if (db.countSince(new Date(now - 60 * 60 * 1000).toISOString()) >= GLOBAL_PER_HOUR) {
    throw new HttpError(503, "The board is very busy right now. Please try again later.");
  }

  const ipHash = db.hashIp(clientIp(req));
  if (db.countFromIpSince(ipHash, new Date(now - PER_IP_COOLDOWN_MS).toISOString()) > 0) {
    throw new HttpError(429, "You just signed! Give it a moment before signing again.");
  }
  if (db.countFromIpSince(ipHash, new Date(now - 24 * 60 * 60 * 1000).toISOString()) >= PER_IP_PER_DAY) {
    throw new HttpError(429, "That's enough signatures from your network for today. Thank you!");
  }

  const entry = db.insert({ name: result.name, sticker: pick(STICKERS), hue: pick(HUES), ipHash });
  console.log(`[guestbook] signed #${entry.id}`);
  return entry;
}

const server = http.createServer(async (req, res) => {
  const { pathname } = new URL(req.url ?? "/", "http://localhost");
  try {
    const originAllowed = applyCors(req, res);

    if (req.method === "OPTIONS") return send(res, 204);
    if (pathname === "/health" && req.method === "GET") return send(res, 200, { ok: true });

    if (pathname === "/api/guestbook") {
      if (req.method === "GET") return send(res, 200, listSignatures());
      if (req.method === "POST") {
        if (!originAllowed) throw new HttpError(403, "Origin not allowed.");
        return send(res, 201, { entry: await sign(req) });
      }
      throw new HttpError(405, "Method not allowed.");
    }

    throw new HttpError(404, "Not found.");
  } catch (err) {
    if (err instanceof HttpError) return send(res, err.status, { error: err.message });
    console.error("[guestbook] unexpected error:", err);
    return send(res, 500, { error: "Something went wrong on the server." });
  }
});

server.listen(PORT, HOST, () => {
  console.log(`[guestbook] listening on http://${HOST}:${PORT} (db: ${DB_PATH})`);
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => {
    server.close(() => {
      db.close();
      process.exit(0);
    });
  });
}
