import { PROBLEM_CONTENT } from "../content/problems.js";

export const PROBLEMS = PROBLEM_CONTENT;

export function getProblemsForStage(stageId) {
  return PROBLEMS.filter((problem) => problem.stageId === stageId);
}

function weightedPick(weighted, random) {
  const total = weighted.reduce((sum, entry) => sum + entry.weight, 0);
  let ticket = random() * total;
  return weighted.find((entry) => {
    ticket -= entry.weight;
    return ticket <= 0;
  }) ?? weighted[weighted.length - 1];
}

export function chooseProblems({ stageId, skills = {}, recentIds = [], count = 3, focusKeys = [], random = Math.random }) {
  const candidates = getProblemsForStage(stageId).filter(
    (problem) => !recentIds.includes(problem.id),
  );
  const pool = candidates.length >= count ? candidates : getProblemsForStage(stageId);
  const weighted = pool.map((problem) => {
    const weakness = problem.targetKeys.reduce(
      (sum, key) => sum + (skills[key]?.reviewWeight ?? 0),
      0,
    );
    return { problem, weight: 1 + weakness };
  });
  const targetCount = Math.min(count, weighted.length);
  const selected = [];
  const focus = new Set(focusKeys);
  const focused = weighted.filter((entry) => entry.problem.targetKeys.some((key) => focus.has(key)));
  if (focused.length > 0) {
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
