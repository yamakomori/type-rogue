import { PROBLEM_CONTENT } from "../content/problems.js";

export const PROBLEMS = PROBLEM_CONTENT;

export function getProblemsForStage(stageId) {
  return PROBLEMS.filter((problem) => problem.stageId === stageId);
}

export function chooseProblems({ stageId, skills = {}, recentIds = [], count = 3 }) {
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
  const selected = [];
  while (selected.length < Math.min(count, weighted.length)) {
    const total = weighted.reduce((sum, entry) => sum + entry.weight, 0);
    let ticket = Math.random() * total;
    const chosen = weighted.find((entry) => {
      ticket -= entry.weight;
      return ticket <= 0;
    }) ?? weighted[weighted.length - 1];
    selected.push(chosen.problem);
    weighted.splice(weighted.indexOf(chosen), 1);
  }
  return selected;
}
