import test from "node:test";
import assert from "node:assert/strict";
import { purchase } from "../src/domain/economy.js";
import { updateSkills } from "../src/domain/learning.js";
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
