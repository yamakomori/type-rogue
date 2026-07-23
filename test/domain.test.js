import test from "node:test";
import assert from "node:assert/strict";
import { purchase } from "../src/domain/economy.js";
import { awardStageMedals, summarizePlay, updateSkills } from "../src/domain/learning.js";
import { loadSave } from "../src/domain/save.js";
import { fishCollectionStats, fishForCatch } from "../src/domain/fish.js";
import { completedAttempt, startAttempt, submitKey } from "../src/domain/session.js";

test("mistakes raise only the relevant key review weight", () => {
  const skills = updateSkills({}, {
    targetKeys: ["f", "j"],
    mistakeKeys: { d: 2 },
  });
  assert.equal(skills.f.correct, 1);
  assert.equal(skills.d.mistakes, 2);
  assert.equal(skills.d.reviewWeight, 2);
});

test("purchase equips an unowned affordable item", () => {
  const save = {
    coins: 15,
    ownedItemIds: ["body-moss", "head-none", "outfit-cloth"],
    equipped: { bodyColor: "body-moss", head: "head-none", outfit: "outfit-cloth" },
  };
  const outcome = purchase(save, "head-leaf");
  assert.equal(outcome.ok, true);
  assert.equal(outcome.save.coins, 3);
  assert.equal(outcome.save.equipped.head, "head-leaf");
});

test("typing session records a miss without losing progress", () => {
  const problem = { id: "test", stageId: "S00", input: "fj", inputMode: "direct", targetKeys: ["f", "j"] };
  const started = startAttempt(problem, 0);
  const wrong = submitKey(started, "d", 10);
  assert.equal(wrong.result.accepted, false);
  const first = submitKey(wrong.attempt, "f", 20);
  const last = submitKey(first.attempt, "j", 30);
  const result = completedAttempt(last.attempt, 30);
  assert.equal(result.mistakes, 1);
  assert.equal(result.mistakeKeys.d, 1);
  assert.equal(result.completed, true);
});

test("stage medals are earned independently and remain earned", () => {
  const summary = summarizePlay([
    { acceptedKeystrokes: 18, mistakes: 1, durationMs: 30000 },
    { acceptedKeystrokes: 18, mistakes: 1, durationMs: 30000 },
    { acceptedKeystrokes: 18, mistakes: 0, durationMs: 30000 },
  ]);
  const first = awardStageMedals({}, {
    carefulMinAccuracy: 0.9,
    speedMaxMsPerKey: 2000,
  }, summary);
  assert.equal(first.newlyEarned.careful, true);
  assert.equal(first.newlyEarned.speed, true);
  assert.equal(first.newlyEarned.gold, true);

  const slower = awardStageMedals(first.medals, {
    carefulMinAccuracy: 0.9,
    speedMaxMsPerKey: 100,
  }, summary);
  assert.deepEqual(slower.medals, { careful: true, speed: true, gold: true });
  assert.deepEqual(slower.newlyEarned, { careful: false, speed: false, gold: false });
});

test("a careful but slow play earns only the careful medal", () => {
  const result = awardStageMedals({}, {
    carefulMinAccuracy: 0.95,
    speedMaxMsPerKey: 1300,
  }, summarizePlay([
    { acceptedKeystrokes: 30, mistakes: 0, durationMs: 90000 },
    { acceptedKeystrokes: 30, mistakes: 0, durationMs: 90000 },
    { acceptedKeystrokes: 30, mistakes: 0, durationMs: 90000 },
  ]));
  assert.deepEqual(result.medals, { careful: true, speed: false, gold: false });
});

test("a fast play with small mistakes can earn only the speed medal", () => {
  const result = awardStageMedals({}, {
    carefulMinAccuracy: 0.97,
    speedMaxMsPerKey: 900,
  }, summarizePlay([
    { acceptedKeystrokes: 30, mistakes: 3, durationMs: 25000 },
    { acceptedKeystrokes: 30, mistakes: 3, durationMs: 25000 },
    { acceptedKeystrokes: 30, mistakes: 2, durationMs: 25000 },
  ]));
  assert.deepEqual(result.medals, { careful: false, speed: true, gold: false });
});

test("a fast play with one mistake per correct key still earns the speed medal", () => {
  const result = awardStageMedals({}, {
    carefulMinAccuracy: 0.95,
    speedMaxMsPerKey: 1600,
  }, summarizePlay([
    { acceptedKeystrokes: 20, mistakes: 20, durationMs: 30000 },
    { acceptedKeystrokes: 20, mistakes: 20, durationMs: 30000 },
    { acceptedKeystrokes: 20, mistakes: 20, durationMs: 30000 },
  ]));
  assert.deepEqual(result.medals, { careful: false, speed: true, gold: false });
});

test("old medal rules reset prototype medals once", () => {
  const storage = {
    getItem: () => JSON.stringify({ schemaVersion: 1, medalRulesVersion: 3, stageMedals: { S00: { careful: true, speed: true, gold: true } } }),
  };
  assert.deepEqual(loadSave(storage).stageMedals, {});
});

test("every completed play produces one deterministic fish, with medals changing only its variant", () => {
  const common = fishForCatch({ stageId: "S00", playCount: 1 });
  const gold = fishForCatch({ stageId: "S00", playCount: 1, medals: { gold: true } });
  assert.equal(common.speciesId, "tide-goby");
  assert.equal(common.variant, "common");
  assert.equal(gold.speciesId, "tide-goby");
  assert.equal(gold.variant, "gold");
  assert.deepEqual(fishCollectionStats([common, gold]), { total: 2, species: 1 });
});
