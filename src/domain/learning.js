export function emptySkill(key) {
  return { key, exposures: 0, correct: 0, mistakes: 0, reviewWeight: 0 };
}

const CONCEPT_LABELS = {
  hatsuon: "「ん」のことば",
  sokuon: "小さい「っ」",
  choon: "のばす音「ー」",
  yoon: "小さい「ゃ・ゅ・ょ」",
};

export function learningConceptLabel(tag) {
  return CONCEPT_LABELS[tag] ?? tag;
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

export function updateConceptSkills(conceptSkills, attempt) {
  const next = structuredClone(conceptSkills ?? {});
  for (const tag of [...new Set(attempt.learningTags ?? [])]) {
    const skill = next[tag] ?? { tag, exposures: 0, correct: 0, mistakes: 0, reviewWeight: 0 };
    skill.exposures += 1;
    if (attempt.mistakes === 0) {
      skill.correct += 1;
      skill.reviewWeight = Math.max(0, Number((skill.reviewWeight * 0.68).toFixed(2)));
    } else {
      skill.mistakes += attempt.mistakes;
      skill.reviewWeight = Math.min(4, Number((skill.reviewWeight + Math.min(1.5, 0.45 + attempt.mistakes * 0.2)).toFixed(2)));
    }
    next[tag] = skill;
  }
  return next;
}

export function reviewKeysForStage(skills = {}, availableKeys = [], max = 2) {
  return [...new Set(availableKeys)]
    .map((key) => ({ key, weight: skills[key]?.reviewWeight ?? 0 }))
    .filter((entry) => entry.weight >= 0.75)
    .sort((a, b) => b.weight - a.weight || a.key.localeCompare(b.key))
    .slice(0, max)
    .map((entry) => entry.key);
}

export function reviewConceptsForStage(conceptSkills = {}, focusTags = [], max = 2) {
  return [...new Set(focusTags)]
    .map((tag) => ({ tag, weight: conceptSkills[tag]?.reviewWeight ?? 0 }))
    .filter((entry) => entry.weight >= 0.6)
    .sort((a, b) => b.weight - a.weight || a.tag.localeCompare(b.tag))
    .slice(0, max)
    .map((entry) => entry.tag);
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

export function summarizePlay(attempts) {
  const acceptedKeystrokes = attempts.reduce((sum, attempt) => sum + attempt.acceptedKeystrokes, 0);
  const mistakes = attempts.reduce((sum, attempt) => sum + attempt.mistakes, 0);
  const durationMs = attempts.reduce((sum, attempt) => sum + attempt.durationMs, 0);
  const expectedKeystrokes = attempts.reduce((sum, attempt) => sum + (attempt.estimatedKeystrokes ?? attempt.acceptedKeystrokes), 0);
  const accuracy = acceptedKeystrokes + mistakes === 0 ? 0 : acceptedKeystrokes / (acceptedKeystrokes + mistakes);
  const totalKeystrokes = acceptedKeystrokes + mistakes;
  const kpm = durationMs === 0 ? 0 : Math.round((totalKeystrokes / durationMs) * 60000);
  return { acceptedKeystrokes, mistakes, totalKeystrokes, expectedKeystrokes, durationMs, accuracy, kpm };
}

export function awardStageMedals(existing = {}, criteria, summary) {
  const qualifiesCareful = summary.accuracy >= criteria.carefulMinAccuracy;
  const speedTargetMs = summary.expectedKeystrokes * criteria.speedMaxMsPerKey;
  const qualifiesSpeed = summary.durationMs <= speedTargetMs;
  const qualifiesGold = qualifiesCareful && qualifiesSpeed;
  const next = {
    careful: existing.careful || qualifiesCareful,
    speed: existing.speed || qualifiesSpeed,
    gold: existing.gold || qualifiesGold,
  };
  return {
    medals: next,
    newlyEarned: {
      careful: !existing.careful && qualifiesCareful,
      speed: !existing.speed && qualifiesSpeed,
      gold: !existing.gold && qualifiesGold,
    },
  };
}
