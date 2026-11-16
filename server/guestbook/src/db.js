import { DatabaseSync } from "node:sqlite";
import { createHash, randomBytes } from "node:crypto";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { bounds, place } from "./layout.js";

const SCHEMA = `
  PRAGMA journal_mode = WAL;
  CREATE TABLE IF NOT EXISTS signatures (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    name       TEXT    NOT NULL,
    sticker    TEXT    NOT NULL,
    hue        INTEGER NOT NULL,
    ip_hash    TEXT    NOT NULL,
    hidden     INTEGER NOT NULL DEFAULT 0,
    created_at TEXT    NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_signatures_ip_time ON signatures (ip_hash, created_at);
  CREATE INDEX IF NOT EXISTS idx_signatures_time    ON signatures (created_at);
  CREATE TABLE IF NOT EXISTS meta (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
`;

// Where each sticker sits on the wall (added after launch, so added carefully).
const POSITION_COLUMNS = [
  ["x", "INTEGER"],
  ["y", "INTEGER"],
  ["r", "REAL"],
];

const toEntry = (row) => ({
  id: Number(row.id),
  name: row.name,
  sticker: row.sticker,
  hue: Number(row.hue),
  createdAt: row.created_at,
  x: Number(row.x),
  y: Number(row.y),
  r: Number(row.r),
});

export function openDb(path) {
  mkdirSync(dirname(path), { recursive: true });
  const db = new DatabaseSync(path);
  db.exec(SCHEMA);

  const columns = new Set(db.prepare("PRAGMA table_info(signatures)").all().map((c) => c.name));
  for (const [name, type] of POSITION_COLUMNS) {
    if (!columns.has(name)) db.exec(`ALTER TABLE signatures ADD COLUMN ${name} ${type}`);
  }

  // A per-install secret so stored IP hashes can't be reversed with a lookup table.
  let salt = db.prepare("SELECT value FROM meta WHERE key = 'ip_salt'").get()?.value;
  if (!salt) {
    salt = randomBytes(16).toString("hex");
    db.prepare("INSERT INTO meta (key, value) VALUES ('ip_salt', ?)").run(salt);
  }

  const q = {
    list: db.prepare(
      `SELECT id, name, sticker, hue, created_at, x, y, r FROM signatures
       WHERE hidden = 0 ORDER BY id DESC LIMIT ?`,
    ),
    count: db.prepare("SELECT COUNT(*) AS n FROM signatures WHERE hidden = 0"),
    countFromIpSince: db.prepare(
      "SELECT COUNT(*) AS n FROM signatures WHERE ip_hash = ? AND created_at >= ?",
    ),
    countSince: db.prepare("SELECT COUNT(*) AS n FROM signatures WHERE created_at >= ?"),
    insert: db.prepare(
      `INSERT INTO signatures (name, sticker, hue, ip_hash, created_at)
       VALUES (?, ?, ?, ?, ?)`,
    ),
    setPosition: db.prepare("UPDATE signatures SET x = ?, y = ?, r = ? WHERE id = ?"),
    positions: db.prepare("SELECT id, name, x, y, r FROM signatures ORDER BY id ASC"),
    all: db.prepare(
      "SELECT id, name, sticker, hue, hidden, created_at, x, y, r FROM signatures ORDER BY id DESC LIMIT ?",
    ),
    setHidden: db.prepare("UPDATE signatures SET hidden = ? WHERE id = ?"),
    remove: db.prepare("DELETE FROM signatures WHERE id = ?"),
  };

  // Every sticker's footprint, hidden ones included, so un-hiding never
  // collides. Rows from before positions existed are placed now, oldest first.
  const placed = [];
  for (const row of q.positions.all()) {
    if (row.x === null || row.y === null || row.r === null) {
      const spot = place(Number(row.id), row.name, placed);
      q.setPosition.run(spot.x, spot.y, spot.r, row.id);
      placed.push(spot);
    } else {
      placed.push({ x: Number(row.x), y: Number(row.y), ...bounds(row.name, Number(row.r)) });
    }
  }

  return {
    hashIp: (ip) => createHash("sha256").update(`${salt}:${ip}`).digest("hex").slice(0, 32),
    list: (limit) => q.list.all(limit).map(toEntry),
    count: () => Number(q.count.get().n),
    countFromIpSince: (ipHash, sinceIso) => Number(q.countFromIpSince.get(ipHash, sinceIso).n),
    countSince: (sinceIso) => Number(q.countSince.get(sinceIso).n),
    insert({ name, sticker, hue, ipHash }) {
      const createdAt = new Date().toISOString();
      const id = Number(q.insert.run(name, sticker, hue, ipHash, createdAt).lastInsertRowid);
      // Node runs one request at a time and SQLite here is synchronous, so no
      // other signature can claim this spot between choosing and saving it.
      const spot = place(id, name, placed);
      q.setPosition.run(spot.x, spot.y, spot.r, id);
      placed.push(spot);
      return { id, name, sticker, hue, createdAt, x: spot.x, y: spot.y, r: spot.r };
    },
    all: (limit) =>
      q.all.all(limit).map((row) => ({ ...toEntry(row), hidden: Boolean(row.hidden) })),
    setHidden: (id, hidden) => q.setHidden.run(hidden ? 1 : 0, id).changes > 0,
    remove: (id) => q.remove.run(id).changes > 0,
    close: () => db.close(),
  };
}
