// Where each signature sits on the wall. The server stores positions when a
// name is signed; this mirror (of server/guestbook/src/layout.js) is only a
// fallback for entries that arrive without one. Keep the two in sync.
//
// World coordinates are sticker centres; (0, 0) is the middle of the wall.

export const L = { H: 56, GAP: 14, BASE_W: 480, BASE_H: 240, GROW: 0.5, TRIES: 48 };

// Counts what you see ("भा" is one letter, not two). Very old browsers
// without Intl.Segmenter fall back to counting code points.
const segmenter = typeof Intl.Segmenter === "function" ? new Intl.Segmenter(undefined, { granularity: "grapheme" }) : null;
const letters = (name: string) => (segmenter ? [...segmenter.segment(name)].length : [...name].length);

/** Sticker width from the name length (never measured, so server and browser agree). */
export const stickerWidth = (name: string) => Math.round(Math.min(356, Math.max(112, 70 + letters(name) * 14)));

function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export type Footprint = { x: number; y: number; bw: number; bh: number };
export type Spot = { x: number; y: number; r: number };

export function bounds(name: string, r: number) {
  const w = stickerWidth(name);
  const a = (Math.abs(r) * Math.PI) / 180;
  return {
    bw: w * Math.cos(a) + L.H * Math.sin(a) + L.GAP,
    bh: w * Math.sin(a) + L.H * Math.cos(a) + L.GAP,
  };
}

export function place(id: number, name: string, placed: Footprint[]): Spot & Footprint {
  const rnd = mulberry32(Math.imul(id, 2654435761));
  const maxTilt = stickerWidth(name) > 220 ? 3 : 6;
  const r = Math.round((rnd() * 2 - 1) * maxTilt * 10) / 10;
  const { bw, bh } = bounds(name, r);
  for (let level = 0; ; level++) {
    const hw = Math.max(0, L.BASE_W * (1 + L.GROW * level) - bw / 2);
    const hh = Math.max(0, L.BASE_H * (1 + L.GROW * level) - bh / 2);
    for (let t = 0; t < L.TRIES; t++) {
      const x = Math.round((rnd() * 2 - 1) * hw);
      const y = Math.round((rnd() * 2 - 1) * hh);
      const overlaps = placed.some(
        (p) => Math.abs(p.x - x) < (p.bw + bw) / 2 && Math.abs(p.y - y) < (p.bh + bh) / 2,
      );
      if (!overlaps) return { x, y, r, bw, bh };
    }
  }
}

/** Fills in positions for any entries that came without one, oldest first. */
export function layoutAll<T extends { id: number; name: string; x?: number; y?: number; r?: number }>(
  entries: T[],
): (T & Spot)[] {
  const placed: Footprint[] = [];
  const result = new Map<number, T & Spot>();
  const ordered = [...entries].sort((a, b) => a.id - b.id);
  for (const e of ordered) {
    if (Number.isFinite(e.x) && Number.isFinite(e.y) && Number.isFinite(e.r)) {
      placed.push({ x: e.x!, y: e.y!, ...bounds(e.name, e.r!) });
      result.set(e.id, e as T & Spot);
    }
  }
  for (const e of ordered) {
    if (result.has(e.id)) continue;
    const spot = place(e.id, e.name, placed);
    placed.push(spot);
    result.set(e.id, { ...e, x: spot.x, y: spot.y, r: spot.r });
  }
  return entries.map((e) => result.get(e.id)!);
}
