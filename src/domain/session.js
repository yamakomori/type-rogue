import { createMatcher } from "./romaji.js";

export function startAttempt(problem, now = Date.now()) {
  const matcher = createMatcher(problem.inputMode);
  matcher.load(problem.input);
  return {
    problem,
    matcher,
    startedAt: now,
    acceptedKeystrokes: 0,
    mistakes: 0,
    mistakeKeys: {},
    completed: false,
  };
}

export function submitKey(attempt, key, now = Date.now()) {
  if (attempt.completed) return { attempt, result: null };
  const result = attempt.matcher.handleChar(key);
  const next = {
    ...attempt,
    acceptedKeystrokes: attempt.acceptedKeystrokes + (result.accepted ? 1 : 0),
    mistakes: attempt.mistakes + (result.accepted ? 0 : 1),
    mistakeKeys: result.accepted
      ? attempt.mistakeKeys
      : { ...attempt.mistakeKeys, [key]: (attempt.mistakeKeys[key] ?? 0) + 1 },
    completed: result.completed,
  };
  return {
    attempt: next,
    result: {
      ...result,
      display: next.matcher.display(),
      durationMs: result.completed ? now - attempt.startedAt : null,
    },
  };
}

export function completedAttempt(attempt, durationMs) {
  return {
    problemId: attempt.problem.id,
    stageId: attempt.problem.stageId,
    durationMs,
    acceptedKeystrokes: attempt.acceptedKeystrokes,
    mistakes: attempt.mistakes,
    mistakeKeys: attempt.mistakeKeys,
    completed: true,
    targetKeys: attempt.problem.targetKeys,
  };
}
