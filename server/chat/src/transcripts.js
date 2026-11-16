import { appendFile, mkdir, readdir, rm } from "node:fs/promises";
import { join } from "node:path";

const DAY_MS = 24 * 60 * 60 * 1000;
const FILE = /^(\d{4}-\d{2}-\d{2})\.jsonl$/;

// Visitors sometimes type their own contact details. Mask them before saving.
const EMAIL = /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g;
const DIGIT_RUN = /\+?\d[\d\s().-]{6,}\d/g;

export function redact(text) {
  return text
    .replace(EMAIL, "[email]")
    // 9+ digits looks like a phone number; "2019-2022" (8 digits) is left alone.
    .replace(DIGIT_RUN, (run) => (run.replace(/\D/g, "").length >= 9 ? "[phone]" : run));
}

const dayOf = (ms) => new Date(ms).toISOString().slice(0, 10);

/**
 * Saves each question and answer to the phone, one JSON line per turn, in one
 * file per day (UTC). Files older than `retentionDays` are deleted. Nothing
 * that identifies the visitor (IP address, IP hash) is ever written.
 */
export function createTranscriptStore({ dir, retentionDays = 90, now = Date.now, onError = () => {} }) {
  let ready = null;
  const ensureDir = () => (ready ??= mkdir(dir, { recursive: true, mode: 0o700 }));

  // Appends are queued so lines never interleave, and never block an answer.
  let chain = Promise.resolve();

  return {
    record(entry) {
      const line = {
        t: new Date(now()).toISOString(),
        ...entry,
        question: entry.question === undefined ? undefined : redact(entry.question),
      };
      const file = join(dir, `${dayOf(now())}.jsonl`);
      chain = chain
        .then(ensureDir)
        .then(() => appendFile(file, `${JSON.stringify(line)}\n`, { mode: 0o600 }))
        .catch(onError);
      return chain;
    },

    /** Deletes day files older than the retention window. Returns how many. */
    async purge() {
      await ensureDir();
      const cutoff = dayOf(now() - retentionDays * DAY_MS);
      let removed = 0;
      for (const name of await readdir(dir)) {
        const match = name.match(FILE);
        if (match && match[1] < cutoff) {
          await rm(join(dir, name), { force: true });
          removed += 1;
        }
      }
      return removed;
    },

    flush: () => chain,
  };
}
