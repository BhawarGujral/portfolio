import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { L, bounds, place, stickerWidth } from "../src/layout.js";
import { openDb } from "../src/db.js";

const NAMES = ["Bhawar Gujral", "BG", "Mary-Jane", "भावर", "Priya", "K.L.", "Aarav S", "José", "O'Neil", "Sam"];
const nameFor = (id) => NAMES[id % NAMES.length] + (id > 9 ? ` ${id}` : "");

function layout(count) {
  const placed = [];
  for (let id = 1; id <= count; id++) placed.push({ id, ...place(id, nameFor(id), placed) });
  return placed;
}

const overlap = (a, b) => Math.abs(a.x - b.x) < (a.bw + b.bw) / 2 && Math.abs(a.y - b.y) < (a.bh + b.bh) / 2;

test("sticker width grows with the name and stays within limits", () => {
  assert.equal(stickerWidth("A"), 112);
  assert.equal(stickerWidth("Bhawar Gujral"), 70 + 13 * 14);
  assert.equal(stickerWidth("x".repeat(40)), 356);
  assert.equal(stickerWidth("भावर"), stickerWidth("abc"), "counts what you see, not bytes"); // भा + व + र
});

test("the same id and name always land in the same spot", () => {
  assert.deepEqual(place(42, "Priya", []), place(42, "Priya", []));
  assert.notDeepEqual(place(42, "Priya", []), place(43, "Priya", []));
});

test("400 signatures never overlap, and the first ones stay near the middle", () => {
  const placed = layout(400);
  for (let i = 0; i < placed.length; i++) {
    for (let j = i + 1; j < placed.length; j++) {
      assert.ok(!overlap(placed[i], placed[j]), `#${placed[i].id} overlaps #${placed[j].id}`);
    }
  }
  for (const p of placed.slice(0, 10)) {
    assert.ok(Math.abs(p.x) <= L.BASE_W && Math.abs(p.y) <= L.BASE_H, `#${p.id} starts in the first screen`);
  }
  for (const p of placed) assert.ok(Math.abs(p.r) <= 6);
});

test("bounds account for tilt", () => {
  const flat = bounds("Priya", 0);
  const tilted = bounds("Priya", 6);
  assert.equal(flat.bh, L.H + L.GAP);
  assert.ok(tilted.bh > flat.bh);
});

test("an existing database gets positions for old signatures, and new ones get a free spot", () => {
  const dir = mkdtempSync(join(tmpdir(), "gb-"));
  const path = join(dir, "guestbook.db");
  try {
    // A database from before positions existed.
    const old = new DatabaseSync(path);
    old.exec(`CREATE TABLE signatures (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, sticker TEXT NOT NULL,
      hue INTEGER NOT NULL, ip_hash TEXT NOT NULL, hidden INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL);`);
    const add = old.prepare("INSERT INTO signatures (name, sticker, hue, ip_hash, created_at) VALUES (?, 'star', 45, 'h', '2026-11-15T00:00:00Z')");
    for (const name of ["Bhawar Gujral", "Priya", "Sam"]) add.run(name);
    old.close();

    const db = openDb(path);
    const before = db.list(10);
    assert.equal(before.length, 3);
    for (const e of before) assert.ok(Number.isFinite(e.x) && Number.isFinite(e.y) && Number.isFinite(e.r));
    // The oldest signature is placed first, exactly where the algorithm says.
    const first = before.find((e) => e.id === 1);
    const expected = place(1, "Bhawar Gujral", []);
    assert.deepEqual([first.x, first.y, first.r], [expected.x, expected.y, expected.r]);

    const added = db.insert({ name: "New Person", sticker: "rocket", hue: 190, ipHash: "h2" });
    const all = db.list(10).map((e) => ({ ...e, ...bounds(e.name, e.r) }));
    assert.equal(all[0].id, added.id);
    assert.deepEqual([all[0].x, all[0].y, all[0].r], [added.x, added.y, added.r]);
    for (const other of all.slice(1)) assert.ok(!overlap(all[0], other));
    const positions = all.map((e) => [e.id, e.x, e.y, e.r]);
    db.close();

    // Reopening keeps everyone where they were.
    const again = openDb(path);
    assert.deepEqual(again.list(10).map((e) => [e.id, e.x, e.y, e.r]), positions);
    again.close();
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
