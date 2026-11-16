import { createHash, randomBytes } from "node:crypto";
import { isIPv6 } from "node:net";

const DAY = 24 * 60 * 60 * 1000;
const HOUR = 60 * 60 * 1000;

// One IPv6 user usually owns a whole /64, so treat the /64 as one visitor.
function ipv6Prefix(ip) {
  const mapped = ip.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/i);
  if (mapped) return mapped[1];
  const [head, tail = ""] = ip.split("::");
  const front = head ? head.split(":") : [];
  const back = tail ? tail.split(":") : [];
  const groups = ip.includes("::")
    ? [...front, ...Array(8 - front.length - back.length).fill("0"), ...back]
    : front;
  return `${groups.slice(0, 4).map((g) => parseInt(g || "0", 16).toString(16)).join(":")}::/64`;
}

export function normalizeIp(ip) {
  return isIPv6(ip) ? ipv6Prefix(ip) : ip;
}

/**
 * In-memory sliding windows. Visitors are identified by a salted hash of
 * their IP; the salt lives only in memory and changes on every restart.
 */
export function createRateLimiter({ limits, now = Date.now, salt = randomBytes(16).toString("hex") }) {
  const perVisitor = new Map(); // hash -> timestamps
  let global = [];

  const prune = (times, t) => times.filter((x) => t - x < DAY);

  return {
    key: (ip) =>
      createHash("sha256").update(`${salt}:${normalizeIp(ip)}`).digest("hex").slice(0, 32),

    /** @returns {null | { code: "rate_limited" | "busy", retryAfterSec: number }} */
    check(key) {
      const t = now();
      const mine = prune(perVisitor.get(key) ?? [], t);
      const recent = mine.filter((x) => t - x < limits.perIpShortWindowMs);
      if (recent.length >= limits.perIpShort) {
        return {
          code: "rate_limited",
          retryAfterSec: Math.ceil((recent[0] + limits.perIpShortWindowMs - t) / 1000),
        };
      }
      if (mine.length >= limits.perIpDay) {
        return { code: "rate_limited", retryAfterSec: Math.ceil((mine[0] + DAY - t) / 1000) };
      }
      global = prune(global, t);
      const lastHour = global.filter((x) => t - x < HOUR).length;
      if (lastHour >= limits.globalHour || global.length >= limits.globalDay) {
        return { code: "busy", retryAfterSec: 60 };
      }
      return null;
    },

    record(key) {
      const t = now();
      perVisitor.set(key, [...prune(perVisitor.get(key) ?? [], t), t]);
      global.push(t);
    },

    sweep() {
      const t = now();
      for (const [key, times] of perVisitor) {
        const kept = prune(times, t);
        if (kept.length) perVisitor.set(key, kept);
        else perVisitor.delete(key);
      }
      global = prune(global, t);
    },

    get trackedVisitors() {
      return perVisitor.size;
    },
  };
}
