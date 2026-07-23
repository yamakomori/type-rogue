import { PROBLEM_CONTENT } from "../content/problems.js";

export const PROBLEMS = PROBLEM_CONTENT;

export function getProblemsForStage(stageId) {
  return PROBLEMS.filter((problem) => problem.stageId === stageId);
}

export function getPracticeKeysForStage(stageId) {
  return [...new Set(getProblemsForStage(stageId).flatMap((problem) => problem.targetKeys))];
}

function weightedPick(weighted, random) {
  const total = weighted.reduce((sum, entry) => sum + entry.weight, 0);
  let ticket = random() * total;
  return weighted.find((entry) => {
    ticket -= entry.weight;
    return ticket <= 0;
  }) ?? weighted[weighted.length - 1];
}

function reserveFocusEntries(weighted, plan, focusKeys, focusTags, random) {
  const keyTokens = [...new Set(focusKeys)].map((key) => ({ type: "key", value: key }));
  const tagTokens = [...new Set(focusTags)].map((tag) => ({ type: "tag", value: tag }));
  const tokens = [...keyTokens, ...tagTokens];
  if (tokens.length === 0) return [];

  const roleCapacity = plan.reduce((counts, role) => ({
    ...counts,
    [role]: (counts[role] ?? 0) + 1,
  }), {});
  const covers = (entry, token) => token.type === "key"
    ? entry.problem.targetKeys.includes(token.value)
    : entry.problem.learningTags?.includes(token.value);
  const focused = weighted.filter((entry) => tokens.some((token) => covers(entry, token)));
  const coversAll = (entries) => tokens.every((token) => entries.some((entry) => covers(entry, token)));

  for (let size = 1; size <= Math.min(tokens.length, plan.length); size += 1) {
    const combinations = [];
    const visit = (start, chosen, roleCounts) => {
      if (chosen.length === size) {
        if (coversAll(chosen)) combinations.push(chosen);
        return;
      }
      for (let index = start; index < focused.length; index += 1) {
        const entry = focused[index];
        const role = entry.problem.lessonRole;
        const nextRoleCount = (roleCounts[role] ?? 0) + 1;
        if (nextRoleCount > (roleCapacity[role] ?? 0)) continue;
        visit(index + 1, [...chosen, entry], { ...roleCounts, [role]: nextRoleCount });
      }
    };
    visit(0, [], {});
    if (combinations.length > 0) {
      return weightedPick(
        combinations.map((entries) => ({
          problem: entries,
          weight: entries.reduce((sum, entry) => sum + entry.weight, 0),
        })),
        random,
      ).problem;
    }
  }
  return [];
}

export function chooseProblems({ stageId, skills = {}, conceptSkills = {}, recentIds = [], count = 3, lessonPlan, focusKeys = [], focusTags = [], random = Math.random }) {
  const allProblems = getProblemsForStage(stageId);
  const candidates = allProblems.filter(
    (problem) => !recentIds.includes(problem.id),
  );
  const legacyPlan = ["intro", "practice", "treasure"];
  const requestedPlan = lessonPlan?.slice(0, count);
  const plan = requestedPlan?.length
    ? requestedPlan
    : legacyPlan.every((role) => allProblems.some((problem) => problem.lessonRole === role))
      ? legacyPlan.slice(0, count)
      : [];
  const requiredByRole = plan.reduce((counts, role) => ({
    ...counts,
    [role]: (counts[role] ?? 0) + 1,
  }), {});
  const canFulfillPlan = (problems) => Object.entries(requiredByRole).every(
    ([role, required]) => problems.filter((problem) => problem.lessonRole === role).length >= required,
  );
  const canCoverFocus = (problems) => (
    focusKeys.every((key) => problems.some((problem) => problem.targetKeys.includes(key)))
    && focusTags.every((tag) => problems.some((problem) => problem.learningTags?.includes(tag)))
  );
  const pool = [...candidates];
  const supplements = allProblems.filter((problem) => !pool.includes(problem));
  const addSupplement = (problem) => {
    if (!problem) return;
    pool.push(problem);
    supplements.splice(supplements.indexOf(problem), 1);
  };
  while (!canCoverFocus(pool)) {
    const missingKeys = focusKeys.filter((key) => !pool.some((problem) => problem.targetKeys.includes(key)));
    const missingTags = focusTags.filter((tag) => !pool.some((problem) => problem.learningTags?.includes(tag)));
    const roleCounts = Object.fromEntries(
      Object.keys(requiredByRole).map((role) => [role, pool.filter((problem) => problem.lessonRole === role).length]),
    );
    const covering = supplements
      .map((problem) => ({
        problem,
        score: missingKeys.filter((key) => problem.targetKeys.includes(key)).length
          + missingTags.filter((tag) => problem.learningTags?.includes(tag)).length
          + ((roleCounts[problem.lessonRole] ?? 0) < (requiredByRole[problem.lessonRole] ?? 0) ? 0.25 : 0),
      }))
      .filter((entry) => entry.score > 0)
      .sort((a, b) => b.score - a.score);
    if (covering.length === 0) break;
    addSupplement(covering[0].problem);
  }
  for (const [role, required] of Object.entries(requiredByRole)) {
    while (pool.filter((problem) => problem.lessonRole === role).length < required) {
      const supplement = supplements.find((problem) => problem.lessonRole === role);
      if (!supplement) break;
      addSupplement(supplement);
    }
  }
  while (pool.length < count && supplements.length > 0) addSupplement(supplements[0]);
  const weighted = pool.map((problem) => {
    const weakness = problem.targetKeys.reduce(
      (sum, key) => sum + (skills[key]?.reviewWeight ?? 0),
      0,
    );
    const conceptWeakness = (problem.learningTags ?? []).reduce(
      (sum, tag) => sum + (conceptSkills[tag]?.reviewWeight ?? 0),
      0,
    );
    const focusBonus = (problem.learningTags ?? []).some((tag) => focusTags.includes(tag)) ? 3 : 0;
    return { problem, weight: 1 + weakness + conceptWeakness + focusBonus };
  });
  const targetCount = Math.min(count, weighted.length);
  const selected = [];
  if (plan.length > 0) {
    const reserved = new Set(reserveFocusEntries(weighted, plan, focusKeys, focusTags, random));
    for (const role of plan) {
      if (selected.length >= targetCount) break;
      const roleEntries = weighted.filter((entry) => entry.problem.lessonRole === role);
      if (roleEntries.length === 0) continue;
      const required = roleEntries.filter((entry) => reserved.has(entry));
      const chosen = weightedPick(required.length > 0 ? required : roleEntries, random);
      selected.push(chosen.problem);
      reserved.delete(chosen);
      weighted.splice(weighted.indexOf(chosen), 1);
    }
  }
  for (const focusKey of plan.length > 0 ? [] : [...new Set(focusKeys)]) {
    if (selected.length >= targetCount) break;
    if (selected.some((problem) => problem.targetKeys.includes(focusKey))) continue;
    const focused = weighted.filter((entry) => entry.problem.targetKeys.includes(focusKey));
    if (focused.length === 0) continue;
    const chosen = weightedPick(focused, random);
    selected.push(chosen.problem);
    weighted.splice(weighted.indexOf(chosen), 1);
  }
  while (selected.length < targetCount) {
    const chosen = weightedPick(weighted, random);
    selected.push(chosen.problem);
    weighted.splice(weighted.indexOf(chosen), 1);
  }
  return selected;
}
