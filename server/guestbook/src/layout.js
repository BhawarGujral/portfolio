// Where each signature sits on the wall. Positions are computed once, when a
// name is signed, and stored, so every visitor sees the same wall.
// Mirrored in src/lib/guestbook-layout.ts — keep the two in sync.
//
// World coordinates are sticker centres; (0, 0) is the middle of the wall.

export const L = { H: 56, GAP: 14, BASE_W: 480, BASE_H: 240, GROW: 0.5, TRIES: 48 };

const segmenter = new Intl.Segmenter(undefined, { granularity: "grapheme" });

/** Sticker width from the name length (never measured, so server and browser agree). */
export const stickerWidth = (name) =>
  Math.round(Math.min(356, Math.max(112, 70 + [...segmenter.segment(name)].length * 14)));

// Small, fast, seeded random number generator: same id → same "random" choices.
function mulberry32(seed) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** The space a tilted sticker takes up, plus a gap around it. */
export function bounds(name, r) {
  const w = stickerWidth(name);
  const a = (Math.abs(r) * Math.PI) / 180;
  return {
    bw: w * Math.cos(a) + L.H * Math.sin(a) + L.GAP,
    bh: w * Math.sin(a) + L.H * Math.cos(a) + L.GAP,
  };
}

/**
 * Picks a spot for a new sticker that doesn't overlap any placed one. It tries
 * random spots inside a rectangle around the centre; if the rectangle is
 * full, the rectangle grows by half its starting size and it tries again.
 *
 * @param {number} id
 * @param {string} name
 * @param {{x:number,y:number,bw:number,bh:number}[]} placed
 */
export function place(id, name, placed) {
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
