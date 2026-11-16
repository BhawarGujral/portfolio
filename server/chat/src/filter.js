import {
  RegExpMatcher,
  englishDataset,
  englishRecommendedTransformers,
} from "obscenity";

const englishMatcher = new RegExpMatcher({
  ...englishDataset.build(),
  ...englishRecommendedTransformers,
});

// Hindi/Punjabi slurs the English filter doesn't know (same lists as the guestbook).
// ANYWHERE terms are blocked when they appear inside a single word.
// WHOLE_WORD terms are only blocked as a word on their own.
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

const containsSlur = (word) =>
  WHOLE_WORD_FOLDED.has(word) || ANYWHERE_FOLDED.some((term) => word.includes(term));

const letterCount = (word) => [...word].length;

/**
 * Profanity check for sentences. Unlike the guestbook's name check, it never
 * glues neighbouring words together, so "began during" is not read as "gandur".
 * The only exception is text spelled out letter by letter ("f u c k").
 */
export function isProfaneProse(text) {
  if (!text) return false;
  if (englishMatcher.hasMatch(text)) return true;

  const words = fold(text).split(/[^\p{L}\p{M}]+/u).filter(Boolean);
  if (words.some(containsSlur)) return true;

  let run = [];
  const runIsProfane = () => {
    if (run.length < 3) return false;
    const joined = run.join("");
    return englishMatcher.hasMatch(joined) || containsSlur(joined);
  };
  for (const word of words) {
    if (letterCount(word) === 1) {
      run.push(word);
      continue;
    }
    if (runIsProfane()) return true;
    run = [];
  }
  return runIsProfane();
}

// Index where releasable text should stop: drop any trailing single-letter
// words ("... f u "), which might be the start of something spelled out.
function cutBeforeTrailingLetters(text) {
  let cut = text.length;
  for (;;) {
    const match = text.slice(0, cut).match(/(\S+)(\s+)$/u);
    if (!match) return cut;
    const letters = match[1].replace(/[^\p{L}\p{M}]/gu, "");
    if (letterCount(letters) !== 1) return cut;
    cut -= match[0].length;
  }
}

/**
 * Filters a streamed answer. Text is only released in whole words that have
 * been checked together with the last 60 characters already sent, so a bad
 * word split across several model tokens is never shown.
 */
export function createStreamFilter(isProfane = isProfaneProse) {
  let pending = "";
  let sentTail = "";

  const release = (text) => {
    sentTail = (sentTail + text).slice(-60);
    return text;
  };

  return {
    push(delta) {
      pending += delta;
      const lastSpace = pending.search(/\s(?=\S*$)/u);
      if (lastSpace < 0) return { emit: "", blocked: false }; // still mid-word
      const complete = pending.slice(0, lastSpace + 1);
      if (isProfane(sentTail + complete)) return { emit: "", blocked: true };
      const cut = cutBeforeTrailingLetters(complete);
      const emit = complete.slice(0, cut);
      pending = pending.slice(cut);
      return { emit: release(emit), blocked: false };
    },
    flush() {
      if (isProfane(sentTail + pending)) return { emit: "", blocked: true };
      const emit = pending;
      pending = "";
      return { emit: release(emit), blocked: false };
    },
  };
}
