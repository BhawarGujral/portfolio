import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { isAbsolute, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const PKG_DIR = fileURLToPath(new URL("..", import.meta.url));

const num = (value, fallback) =>
  value === undefined || value === "" ? fallback : Number(value);

const fromPkg = (path) => (isAbsolute(path) ? path : resolve(PKG_DIR, path));

/**
 * Reads settings from environment variables. `overrides` lets tests shrink
 * timeouts and limits without touching the environment.
 */
export function loadConfig(env = process.env, overrides = {}) {
  const systemPromptPath = fromPkg(env.SYSTEM_PROMPT_PATH ?? "knowledge/about-bhawar.md");
  let systemPrompt;
  try {
    systemPrompt = readFileSync(systemPromptPath, "utf8").trimEnd();
  } catch {
    throw new Error(`System prompt not found at ${systemPromptPath}`);
  }
  if (!systemPrompt) throw new Error(`System prompt at ${systemPromptPath} is empty`);

  const suggestions = JSON.parse(
    readFileSync(fromPkg(env.SUGGESTIONS_PATH ?? "knowledge/suggestions.json"), "utf8"),
  );

  const config = {
    port: num(env.PORT, 8788),
    host: env.HOST ?? "127.0.0.1",
    llamaUrl: (env.LLAMA_URL ?? "http://127.0.0.1:8080").replace(/\/+$/, ""),
    allowedOrigins: new Set(
      (env.ALLOWED_ORIGINS ??
        "https://bhawargujral.com,https://www.bhawargujral.com,http://localhost:5173")
        .split(",")
        .map((o) => o.trim())
        .filter(Boolean),
    ),
    systemPrompt,
    suggestions,
    model: {
      name: env.MODEL_NAME ?? "Gemma 4 E2B",
      quant: env.MODEL_QUANT ?? "Q4_K_M",
      device: env.MODEL_DEVICE ?? "Pixel 7 (Tensor G2)",
    },
    ctxSize: num(env.CTX_SIZE, 4096),
    maxReplyTokens: num(env.MAX_REPLY_TOKENS, 350),
    maxMessageChars: num(env.MAX_MESSAGE_CHARS, 500),
    maxAssistantChars: 2000,
    maxMessages: num(env.MAX_MESSAGES, 16),
    queueMax: num(env.QUEUE_MAX, 4),
    maxBodyBytes: num(env.MAX_BODY_BYTES, 16384),
    tempNapC: num(env.TEMP_NAP_C, 42),
    tempResumeC: num(env.TEMP_RESUME_C, 39),
    batteryCmd: env.BATTERY_CMD ?? "termux-battery-status",
    transcripts: {
      enabled: (env.TRANSCRIPTS ?? "on") !== "off",
      dir: env.TRANSCRIPTS_DIR ?? join(homedir(), "pixel-chats"),
      retentionDays: num(env.TRANSCRIPT_DAYS, 90),
    },
    limits: {
      perIpConcurrent: 1,
      perIpShort: 8, // chats per short window
      perIpShortWindowMs: 5 * 60 * 1000,
      perIpDay: 40,
      globalHour: 120,
      globalDay: 800,
    },
    timeouts: {
      bodyMs: 5_000,
      queueMs: 180_000,
      firstTokenMs: 60_000,
      gapMs: 20_000,
      totalMs: 90_000,
      pingMs: 15_000,
      healthPollMs: 5_000,
      healthTimeoutMs: 2_000,
      batteryPollMs: 60_000,
      batteryTimeoutMs: 5_000,
      warmupMs: 90_000,
      statusCacheMs: 5_000,
    },
  };

  for (const [key, value] of Object.entries(overrides)) {
    config[key] =
      value && typeof value === "object" && !(value instanceof Set) && !Array.isArray(value)
        ? { ...config[key], ...value }
        : value;
  }
  return Object.freeze(config);
}
