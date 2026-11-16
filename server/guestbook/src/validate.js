import {
  RegExpMatcher,
  englishDataset,
  englishRecommendedTransformers,
} from "obscenity";

export const MAX_NAME_LENGTH = 24;

// Letters from any script (so Hindi, Punjabi, etc. work), plus spaces, dots,
// apostrophes and hyphens. No digits, so nobody can post phone numbers or URLs.
const ALLOWED_NAME = /^[\p{L}\p{M}][\p{L}\p{M} .'’-]*$/u;

const englishMatcher = new RegExpMatcher({
  ...englishDataset.build(),
  ...englishRecommendedTransformers,
});

// Hindi/Punjabi slurs that the English filter does not know about.
// ANYWHERE terms are distinctive enough to block even inside a longer word.
// WHOLE_WORD terms only block as a separate word, so real names that happen
// to contain them (Gandhi, Randall, ...) still get through.
const ANYWHERE = [
  "madarchod", "maderchod", "behenchod", "behnchod", "bhenchod", "benchod",
  "chutiya", "chutiye", "chutia", "bhosdike", "bhosdi", "bhosda",
  "jhaatu", "jhantu", "gaandu", "gandu", "lavde", "lawde",
  "मादरचोद", "बहनचोद", "भेनचोद", "चूतिया", "चुतिया", "भोसड़ी", "भोसडी",
  "लंड", "लौड़ा", "लौडा", "रंडी", "गांडू", "गांड", "हरामी", "कमीना",
];
const WHOLE_WORD = [
  "lund", "loda", "lauda", "lawda", "lavda", "gaand", "gand", "randi",
  "chod", "chodu", "harami", "haramkhor", "kamina", "kamine", "kutti", "tatti",
];

// Lowercase, strip accents and squash repeated letters ("chuuutiya" -> "chutiya").
const fold = (s) =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/(.)\1+/gu, "$1");

const ANYWHERE_FOLDED = ANYWHERE.map(fold);
const WHOLE_WORD_FOLDED = new Set(WHOLE_WORD.map(fold));

export function isProfane(text) {
  if (englishMatcher.hasMatch(text)) return true;

  const folded = fold(text);
  const words = folded.split(/[^\p{L}\p{M}]+/u).filter(Boolean);
  // Ignore spaces and punctuation so "madar chod" or "c.h.u.t.i.y.a" are caught.
  const squashed = words.join("");

  // Spelled out letter by letter ("f u c k", "s.h.i.t"): check the joined-up word.
  // Only done for single-letter words, so normal names aren't glued together.
  if (words.length >= 3 && words.every((w) => [...w].length === 1) && englishMatcher.hasMatch(squashed)) {
    return true;
  }
  if (ANYWHERE_FOLDED.some((term) => squashed.includes(term))) return true;

  return words.some((word) => WHOLE_WORD_FOLDED.has(word));
}

export function normalizeName(raw) {
  if (typeof raw !== "string") return "";
  return raw.normalize("NFC").replace(/\s+/g, " ").trim();
}

/** @returns {{ ok: true, name: string } | { ok: false, error: string }} */
export function validateName(raw) {
  const name = normalizeName(raw);
  if (!name) {
    return { ok: false, error: "Please enter your name or initials." };
  }
  if ([...name].length > MAX_NAME_LENGTH) {
    return { ok: false, error: `Please keep it under ${MAX_NAME_LENGTH} characters.` };
  }
  if (!ALLOWED_NAME.test(name)) {
    return {
      ok: false,
      error: "Letters only, please (spaces, dots and hyphens are fine).",
    };
  }
  if (isProfane(name)) {
    return { ok: false, error: "Let's keep the board friendly. Try another name." };
  }
  return { ok: true, name };
}
