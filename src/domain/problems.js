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

export function chooseProblems({ stageId, skills = {}, conceptSkills = {}, recentIds = [], count = 3, focusKeys = [], focusTags = [], random = Math.random }) {
  const candidates = getProblemsForStage(stageId).filter(
    (problem) => !recentIds.includes(problem.id),
  );
  const pool = candidates.length >= count ? candidates : getProblemsForStage(stageId);
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
  const lessonRoles = ["intro", "practice", "treasure"];
  const hasLessonStructure = lessonRoles.every((role) => weighted.some((entry) => entry.problem.lessonRole === role));
  const remainingFocusTags = new Set(focusTags);
  const remainingFocusKeys = new Set(focusKeys);
  if (hasLessonStructure) {
    for (const role of lessonRoles) {
      if (selected.length >= targetCount) break;
      const roleEntries = weighted.filter((entry) => entry.problem.lessonRole === role);
      const coverage = (entry) => (
        entry.problem.targetKeys.filter((key) => remainingFocusKeys.has(key)).length
        + (entry.problem.learningTags ?? []).filter((tag) => remainingFocusTags.has(tag)).length
      );
      const maxCoverage = Math.max(...roleEntries.map(coverage));
      const focused = maxCoverage > 0 ? roleEntries.filter((entry) => coverage(entry) === maxCoverage) : roleEntries;
      const chosen = weightedPick(focused, random);
      selected.push(chosen.problem);
      for (const key of chosen.problem.targetKeys) remainingFocusKeys.delete(key);
      for (const tag of chosen.problem.learningTags ?? []) remainingFocusTags.delete(tag);
      weighted.splice(weighted.indexOf(chosen), 1);
    }
  }
  for (const focusKey of [...new Set(focusKeys)]) {
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
