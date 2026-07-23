import test from "node:test";
import assert from "node:assert/strict";
import { DirectMatcher, RomajiMatcher, validateKana } from "../src/domain/romaji.js";
import { PROBLEMS } from "../src/domain/problems.js";

function type(matcher, input) {
  return [...input].map((char) => matcher.handleChar(char));
}

test("direct matcher progresses through letters and spaces", () => {
  const matcher = new DirectMatcher();
  matcher.load("as df");
  const results = type(matcher, "as df");
  assert.equal(results.every((result) => result.accepted), true);
  assert.equal(results.at(-1).completed, true);
});

test("romaji matcher accepts standard spelling variations", () => {
  for (const spelling of ["shi", "si", "ci"]) {
    const matcher = new RomajiMatcher();
    matcher.load("し");
    const results = type(matcher, spelling);
    assert.equal(results.every((result) => result.accepted), true, spelling);
    assert.equal(results.at(-1).completed, true, spelling);
  }
});

test("romaji hint includes the remaining kana", () => {
  const matcher = new RomajiMatcher();
  matcher.load("かさ");
  assert.equal(matcher.display().next, "k");
  assert.equal(matcher.display().rest, "asa");
});

test("romaji matcher accepts doubled consonants for small tsu", () => {
  const matcher = new RomajiMatcher();
  matcher.load("きって");
  const results = type(matcher, "kitte");
  assert.equal(results.every((result) => result.accepted), true);
  assert.equal(results.at(-1).completed, true);
});

test("romaji matcher handles contextual n", () => {
  const matcher = new RomajiMatcher();
  matcher.load("んか");
  const results = type(matcher, "nka");
  assert.equal(results.every((result) => result.accepted), true);
  assert.equal(results.at(-1).completed, true);

  const vowelMatcher = new RomajiMatcher();
  vowelMatcher.load("んあ");
  assert.equal(vowelMatcher.handleChar("n").accepted, true);
  assert.equal(vowelMatcher.handleChar("a").accepted, false);
  assert.equal(vowelMatcher.handleChar("n").accepted, true);
  assert.equal(vowelMatcher.handleChar("a").completed, true);
});

test("romaji matcher accepts a hyphen for the long vowel mark", () => {
  const matcher = new RomajiMatcher();
  matcher.load("けーき");
  const results = type(matcher, "ke-ki");
  assert.equal(results.every((result) => result.accepted), true);
  assert.equal(results.at(-1).completed, true);
});

test("romaji matcher supports di, du, and voiced yoon", () => {
  for (const [kana, romaji] of [["ぢ", "di"], ["づ", "du"], ["ぢゃ", "dya"], ["ぢゅ", "dyu"], ["ぢょ", "dyo"]]) {
    const matcher = new RomajiMatcher();
    matcher.load(kana);
    const results = type(matcher, romaji);
    assert.equal(results.every((result) => result.accepted), true, kana);
    assert.equal(results.at(-1).completed, true, kana);
  }
});

test("romaji hint follows a complete digraph spelling instead of a dead single-kana branch", () => {
  const matcher = new RomajiMatcher();
  matcher.load("きゅうり");
  assert.deepEqual(matcher.display(), { typed: "", next: "k", rest: "yuuri" });
  matcher.handleChar("k");
  assert.equal(matcher.display().next, "y");
  assert.equal(matcher.handleChar("i").accepted, false);
  assert.equal(matcher.display().next, "y");
});

test("Japanese word data is valid kana for the matcher", () => {
  const problems = PROBLEMS.filter((problem) => problem.inputMode === "ja-romaji");
  assert.ok(problems.length >= 300);
  for (const problem of problems) {
    assert.equal(validateKana(problem.input).valid, true, problem.id);
    const matcher = new RomajiMatcher();
    matcher.load(problem.input);
    let guard = 0;
    let guidedInput = "";
    while (!matcher.done && guard < 200) {
      guard += 1;
      const next = matcher.display().next;
      assert.notEqual(next, "", `${problem.id}: guide should have a next key`);
      assert.equal(matcher.handleChar(next).accepted, true, `${problem.id}: guide key should be accepted`);
      guidedInput += next;
    }
    assert.equal(matcher.done, true, `${problem.id}: guide should complete the problem`);
    assert.equal(guidedInput, problem.preferredInput, `${problem.id}: guide should use the preferred spelling`);
  }
});
