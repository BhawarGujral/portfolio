import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createTranscriptStore, redact } from "../src/transcripts.js";
import { startMockLlama } from "./mock-llama.js";
import { startGateway, untilOnline, post, waitFor } from "./helpers.js";

const DAY = 86_400_000;
const readLines = async (dir) => {
  const lines = [];
  for (const name of (await readdir(dir)).sort()) {
    for (const line of (await readFile(join(dir, name), "utf8")).split("\n")) if (line) lines.push(JSON.parse(line));
  }
  return lines;
};

describe("transcript store", () => {
  let dir;
  before(async () => {
    dir = await mkdtemp(join(tmpdir(), "pixel-chats-"));
  });
  after(() => rm(dir, { recursive: true, force: true }));

  test("masks contact details visitors type, but not year ranges", () => {
    assert.equal(redact("mail me at jane.doe+x@example.co.uk"), "mail me at [email]");
    assert.equal(redact("call +1 (416) 555-0199 today"), "call [phone] today");
    assert.equal(redact("What did he do 2019-2022?"), "What did he do 2019-2022?");
  });

  test("appends one line per turn to a file named after the day, readable only by the owner", async () => {
    const t = Date.UTC(2026, 10, 15, 12);
    const store = createTranscriptStore({ dir, now: () => t });
    await store.record({ conversationId: "abc12345", turn: 1, question: "hi, I'm sam@example.com", answer: "Hello!", outcome: "ok" });
    await store.record({ conversationId: "abc12345", turn: 2, question: "and?", answer: "More.", outcome: "ok" });
    const file = join(dir, "2026-11-15.jsonl");
    const lines = (await readFile(file, "utf8")).trim().split("\n").map((l) => JSON.parse(l));
    assert.equal(lines.length, 2);
    assert.equal(lines[0].question, "hi, I'm [email]");
    assert.equal(lines[0].answer, "Hello!");
    assert.equal(lines[1].turn, 2);
    assert.equal((await stat(file)).mode & 0o777, 0o600);
  });

  test("purges day files older than the retention window and keeps the rest", async () => {
    const t = Date.UTC(2026, 10, 15, 12);
    const day = (offset) => new Date(t - offset * DAY).toISOString().slice(0, 10);
    for (const offset of [0, 89, 90, 91, 200]) await writeFile(join(dir, `${day(offset)}.jsonl`), "{}\n");
    await writeFile(join(dir, "notes.txt"), "not a transcript");
    const store = createTranscriptStore({ dir, retentionDays: 90, now: () => t });
    const removed = await store.purge();
    assert.equal(removed, 2); // 91 and 200 days old
    const left = await readdir(dir);
    for (const offset of [0, 89, 90]) assert.ok(left.includes(`${day(offset)}.jsonl`), `${offset} days kept`);
    assert.ok(left.includes("notes.txt"));
  });
});

describe("gateway saves conversations", () => {
  let llama;
  let gw;
  let dir;

  before(async () => {
    dir = await mkdtemp(join(tmpdir(), "pixel-chats-"));
    llama = await startMockLlama();
    gw = await startGateway(llama.url, { env: { TRANSCRIPTS: "on", TRANSCRIPTS_DIR: dir } });
    await untilOnline(gw.gateway);
  });
  after(async () => {
    await gw.gateway.close();
    await llama.close();
    await rm(dir, { recursive: true, force: true });
  });

  test("records the question, the answer the visitor saw, the outcome and timings, but no IP", async () => {
    const conversationId = "conv-1234abcd";
    await post(gw.url, "/api/chat", { messages: [{ role: "user", content: "Who is Bhawar?" }], conversationId }, { headers: { ip: "198.51.100.201" } });
    await post(
      gw.url,
      "/api/chat",
      {
        messages: [
          { role: "user", content: "Who is Bhawar?" },
          { role: "assistant", content: "Hello there, friend!" },
          { role: "user", content: "And for fun?" },
        ],
        conversationId,
      },
      { headers: { ip: "198.51.100.201" } },
    );
    await gw.gateway.transcripts.flush();
    const lines = await readLines(dir);
    const mine = lines.filter((l) => l.conversationId === conversationId);
    assert.equal(mine.length, 2);
    assert.deepEqual(mine.map((l) => l.turn), [1, 2]);
    assert.equal(mine[0].question, "Who is Bhawar?");
    assert.equal(mine[0].answer, "Hello there, friend!");
    assert.equal(mine[0].outcome, "ok");
    assert.equal(mine[0].timings.tokPerSec, 7.5);
    const raw = JSON.stringify(lines);
    assert.ok(!raw.includes("198.51.100.201"), "no IP address is stored");
    assert.ok(!/"ip|hash"/i.test(raw), "no IP or hash fields");
  });

  test("records rude questions as input_blocked, ignores bogus conversation IDs and honeypot bots", async () => {
    await post(gw.url, "/api/chat", { messages: [{ role: "user", content: "you madarchod" }], conversationId: "x" }, { headers: { ip: "198.51.100.202" } });
    await post(gw.url, "/api/chat", { messages: [{ role: "user", content: "spam" }], website: "bot.example" }, { headers: { ip: "198.51.100.203" } });
    await gw.gateway.transcripts.flush();
    await waitFor(async () => (await readLines(dir)).some((l) => l.outcome === "input_blocked"));
    const lines = await readLines(dir);
    const blocked = lines.find((l) => l.outcome === "input_blocked");
    assert.equal(blocked.conversationId, null);
    assert.ok(!lines.some((l) => l.question === "spam"));
  });
});
