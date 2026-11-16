// Review saved conversations on the phone:
//   npm run chats                    conversations from the last 3 days
//   npm run chats -- --days 14       ...from the last 14 days
//   npm run chats -- stats           how Pixel is doing (last 30 days)
//   npm run chats -- stats --days 7
import { readdir, readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";

const DIR = process.env.TRANSCRIPTS_DIR ?? join(homedir(), "pixel-chats");
const args = process.argv.slice(2);
const command = args[0] === "stats" ? "stats" : "show";
const daysArg = args.indexOf("--days");
const days = daysArg >= 0 ? Number(args[daysArg + 1]) : command === "stats" ? 30 : 3;

async function loadTurns() {
  const since = new Date(Date.now() - (days - 1) * 86_400_000).toISOString().slice(0, 10);
  let names = [];
  try {
    names = (await readdir(DIR)).filter((n) => /^\d{4}-\d{2}-\d{2}\.jsonl$/.test(n) && n.slice(0, 10) >= since).sort();
  } catch {
    console.log(`No saved chats yet (${DIR} doesn't exist).`);
    process.exit(0);
  }
  const turns = [];
  for (const name of names) {
    for (const line of (await readFile(join(DIR, name), "utf8")).split("\n")) {
      if (!line.trim()) continue;
      try {
        turns.push(JSON.parse(line));
      } catch {
        // skip a half-written line
      }
    }
  }
  return turns;
}

const local = (iso) =>
  new Date(iso).toLocaleString("en-CA", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
const seconds = (ms) => (ms == null ? "?" : `${(ms / 1000).toFixed(1)} s`);
const percentile = (sorted, p) => sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))];
const OK = new Set(["ok"]);

function show(turns) {
  if (!turns.length) return console.log(`No chats in the last ${days} day(s).`);
  const groups = new Map();
  turns.forEach((turn, i) => {
    const key = turn.conversationId ?? `single-${i}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(turn);
  });
  for (const [key, list] of groups) {
    const label = key.startsWith("single-") ? "single question" : `chat ${key.slice(0, 8)}`;
    console.log(`\n── ${local(list[0].t)} · ${label} · ${list.length} turn${list.length === 1 ? "" : "s"} ──`);
    for (const turn of list) {
      console.log(`  Q: ${turn.question ?? ""}`);
      if (turn.answer) console.log(`  A: ${turn.answer}`);
      const t = turn.timings ?? {};
      const speed = OK.has(turn.outcome) ? `${t.tokPerSec ?? "?"} tok/s · first word ${seconds(t.ttftMs)}` : "";
      console.log(`     ${OK.has(turn.outcome) ? "✓" : "✗"} ${turn.outcome}${speed ? ` · ${speed}` : ""}${turn.historyTrimmed ? " · history trimmed" : ""}`);
    }
  }
  console.log(`\n${turns.length} turn(s) in ${groups.size} conversation(s), last ${days} day(s).`);
}

function stats(turns) {
  if (!turns.length) return console.log(`No chats in the last ${days} day(s).`);
  const answered = turns.filter((t) => t.outcome === "ok");
  const tps = answered.map((t) => t.timings?.tokPerSec).filter(Number.isFinite).sort((a, b) => a - b);
  const ttft = answered.map((t) => t.timings?.ttftMs).filter(Number.isFinite).sort((a, b) => a - b);
  const conversations = new Set(turns.map((t) => t.conversationId).filter(Boolean));
  const outcomes = {};
  for (const t of turns) outcomes[t.outcome] = (outcomes[t.outcome] ?? 0) + 1;
  const openers = {};
  for (const t of turns.filter((t) => t.turn === 1 && t.question)) {
    const q = t.question.trim().toLowerCase();
    openers[q] = (openers[q] ?? 0) + 1;
  }

  console.log(`Pixel, last ${days} day(s)`);
  console.log(`  Questions:      ${turns.length} in ${conversations.size} conversation(s)`);
  console.log(`  Answered:       ${answered.length} (${Math.round((answered.length / turns.length) * 100)}%)`);
  for (const [outcome, n] of Object.entries(outcomes).sort((a, b) => b[1] - a[1])) {
    if (outcome !== "ok") console.log(`    ${outcome.padEnd(14)} ${n}`);
  }
  if (tps.length) {
    console.log(`  Speed:          ${(tps.reduce((a, b) => a + b, 0) / tps.length).toFixed(1)} tok/s average (slowest ${tps[0]}, fastest ${tps.at(-1)})`);
  }
  if (ttft.length) {
    console.log(`  First word:     ${seconds(percentile(ttft, 0.5))} typical, ${seconds(percentile(ttft, 0.9))} for the slowest 10%`);
  }
  const top = Object.entries(openers).sort((a, b) => b[1] - a[1]).slice(0, 5);
  if (top.length) {
    console.log("  Top first questions:");
    for (const [q, n] of top) console.log(`    ${String(n).padStart(3)}× ${q}`);
  }
}

const turns = await loadTurns();
if (command === "stats") stats(turns);
else show(turns);
