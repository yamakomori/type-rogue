export function emptySkill(key) {
  return { key, exposures: 0, correct: 0, mistakes: 0, reviewWeight: 0 };
}

export function updateSkills(skills, attempt) {
  const next = structuredClone(skills ?? {});
  for (const key of attempt.targetKeys) {
    const skill = next[key] ?? emptySkill(key);
    skill.exposures += 1;
    skill.correct += 1;
    skill.reviewWeight = Math.max(0, Number((skill.reviewWeight * 0.72).toFixed(2)));
    next[key] = skill;
  }
  for (const [key, count] of Object.entries(attempt.mistakeKeys)) {
    const skill = next[key] ?? emptySkill(key);
    skill.mistakes += count;
    skill.reviewWeight = Math.min(4, Number((skill.reviewWeight + count).toFixed(2)));
    next[key] = skill;
  }
  return next;
}

export function attemptAccuracy(attempt) {
  const total = attempt.acceptedKeystrokes + attempt.mistakes;
  return total === 0 ? 0 : attempt.acceptedKeystrokes / total;
}

export function stageAccuracy(attempts, stageId) {
  const relevant = attempts.filter((attempt) => attempt.stageId === stageId && attempt.completed);
  const accepted = relevant.reduce((sum, attempt) => sum + attempt.acceptedKeystrokes, 0);
  const mistakes = relevant.reduce((sum, attempt) => sum + attempt.mistakes, 0);
  return accepted + mistakes === 0 ? 0 : accepted / (accepted + mistakes);
}
