import test from "node:test";
import assert from "node:assert/strict";
import { purchase } from "../src/domain/economy.js";
import { awardStageMedals, reviewKeysForStage, summarizePlay, updateSkills } from "../src/domain/learning.js";
import { chooseProblems } from "../src/domain/problems.js";
import { createSave, loadSave } from "../src/domain/save.js";
import { fishCollectionStats, fishCountsBySpecies, fishDiscovery, fishForCatch, releaseFish } from "../src/domain/fish.js";
import { completedAttempt, startAttempt, submitKey } from "../src/domain/session.js";
import { createGameState } from "../src/game/state/gameReducer.js";

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

test("old saves derive species discoveries from fish already in a tank", () => {
  const fish = fishForCatch({ stageId: "S00", playCount: 1 });
  const storage = {
    getItem: () => JSON.stringify({ schemaVersion: 1, medalRulesVersion: 4, caughtFish: [fish] }),
  };
  assert.deepEqual(loadSave(storage).discoveredFishSpeciesIds, [fish.speciesId]);
});

test("a new adventure begins with the optional first typing guide only once", () => {
  const fresh = createSave();
  assert.equal(createGameState(fresh).screen, "intro");
  const existing = { ...fresh, hasSeenIntro: true };
  assert.equal(createGameState(existing).screen, "map");
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

test("fish discovery counts only species found in the selected sea", () => {
  const first = fishForCatch({ stageId: "S00", playCount: 1 });
  const discovery = fishDiscovery([first.speciesId], ["S00"]);
  assert.equal(discovery.total, 2);
  assert.equal(discovery.discovered, 1);
  assert.deepEqual(fishCountsBySpecies([first]), { "tide-goby": 1 });
});

test("releasing a fish removes only its tank instance and keeps its species discovery", () => {
  const fish = fishForCatch({ stageId: "S00", playCount: 1 });
  const save = {
    ...createSave(),
    caughtFish: [fish],
    discoveredFishSpeciesIds: [fish.speciesId],
  };
  const released = releaseFish(save, fish.id);
  assert.deepEqual(released.caughtFish, []);
  assert.deepEqual(released.discoveredFishSpeciesIds, [fish.speciesId]);
  assert.equal(released.releasedFishCounts.tidepool, 1);
});

test("every displayed review key is included in one of the selected problems", () => {
  const skills = {
    f: { reviewWeight: 1.5 },
    j: { reviewWeight: 1 },
    q: { reviewWeight: 3 },
  };
  const reviewKeys = reviewKeysForStage(skills, ["f", "j"]);
  assert.deepEqual(reviewKeys, ["f", "j"]);
  const selected = chooseProblems({
    stageId: "S00",
    count: 3,
    focusKeys: reviewKeys,
    random: () => 0,
  });
  assert.equal(selected.length, 3);
  assert.equal(selected.some((problem) => problem.targetKeys.includes("f")), true);
  assert.equal(selected.some((problem) => problem.targetKeys.includes("j")), true);
});
