import { test } from "node:test";
import assert from "node:assert/strict";
import { validateName, MAX_NAME_LENGTH } from "../src/validate.js";

const accepted = [
  "Bhawar Gujral",
  "B.G.",
  "BG",
  "Mary-Jane",
  "O'Neil",
  "भावर",
  "José",
  "Gandhi",
  "Randall",
];

const rejected = [
  ["", "empty"],
  ["   ", "only spaces"],
  ["x".repeat(MAX_NAME_LENGTH + 1), "too long"],
  ["call 5551234", "digits"],
  ["<script>", "markup"],
  ["visit evil.com/x", "url characters"],
  ["fuck", "english profanity"],
  ["f u c k", "spaced-out profanity"],
  ["Shiiit", "stretched profanity"],
  ["chutiya", "hinglish slur"],
  ["Madar Chod", "hinglish slur split by a space"],
  ["randi", "hinglish slur as a whole word"],
  ["चूतिया", "devanagari slur"],
];

for (const name of accepted) {
  test(`accepts "${name}"`, () => {
    const result = validateName(name);
    assert.equal(result.ok, true, result.error);
  });
}

for (const [name, why] of rejected) {
  test(`rejects ${why}`, () => {
    assert.equal(validateName(name).ok, false);
  });
}

test("normalises whitespace", () => {
  assert.deepEqual(validateName("  Bhawar   Gujral "), { ok: true, name: "Bhawar Gujral" });
});
