import { getNextStage, getStage } from "../../domain/curriculum.js";
import { chooseProblems } from "../../domain/problems.js";
import { equip, getItem, purchase, rewardForPlay, rewardForProblem } from "../../domain/economy.js";
import { awardStageMedals, stageAccuracy, summarizePlay, updateSkills } from "../../domain/learning.js";
import { createSave } from "../../domain/save.js";
import { completedAttempt, startAttempt, submitKey } from "../../domain/session.js";

export function createGameState(save) {
  return { screen: "map", save, session: null, result: null, message: "" };
}

function startStage(state, stageId, allowLocked = false) {
  if (!allowLocked && !state.save.unlockedStageIds.includes(stageId)) return state;
  const stage = getStage(stageId);
  const problems = chooseProblems({
    stageId,
    skills: state.save.skills,
    recentIds: state.save.recentProblemIds,
    count: 3,
  });
  if (problems.length === 0) return { ...state, message: "この道の問題を準備中です。" };
  return {
    ...state,
    screen: "typing",
    message: "",
    session: {
      stage,
      problems,
      index: 0,
      attempt: startAttempt(problems[0]),
      earned: { coins: 0, xp: 0 },
      completedAttempts: [],
      feedback: "",
    },
  };
}

function completeProblem(state, nextAttempt, durationMs) {
  const finished = completedAttempt(nextAttempt, durationMs);
  const reward = rewardForProblem();
  const save = {
    ...state.save,
    coins: state.save.coins + reward.coins,
    xp: state.save.xp + reward.xp,
    skills: updateSkills(state.save.skills, finished),
    completedProblemIds: [...new Set([...state.save.completedProblemIds, finished.problemId])],
    recentProblemIds: [...state.save.recentProblemIds, finished.problemId].slice(-10),
  };
  return {
    ...state,
    save,
    session: {
      ...state.session,
      attempt: nextAttempt,
      completedAttempts: [...state.session.completedAttempts, finished],
      earned: {
        coins: state.session.earned.coins + reward.coins,
        xp: state.session.earned.xp + reward.xp,
      },
      feedback: "みつけた！ 小さなひかりが ふえたよ。",
    },
  };
}

function finishPlay(state) {
  if (!state.session) return state;
  const stageId = state.session.stage.id;
  const bonus = rewardForPlay();
  const playCount = (state.save.stagePlayCounts[stageId] ?? 0) + 1;
  const nextStage = getNextStage(stageId);
  const unlockedStageId = nextStage
    && playCount >= state.session.stage.minCompletedPlays
    && !state.save.unlockedStageIds.includes(nextStage.id)
    ? nextStage.id : null;
  const attempts = [...state.save.attempts, ...state.session.completedAttempts].slice(-300);
  const playSummary = summarizePlay(state.session.completedAttempts);
  const medalAward = awardStageMedals(
    state.save.stageMedals[stageId],
    state.session.stage.medalCriteria,
    playSummary,
  );
  const save = {
    ...state.save,
    coins: state.save.coins + bonus.coins,
    xp: state.save.xp + bonus.xp,
    attempts,
    stagePlayCounts: { ...state.save.stagePlayCounts, [stageId]: playCount },
    stageMedals: { ...state.save.stageMedals, [stageId]: medalAward.medals },
    unlockedStageIds: unlockedStageId
      ? [...state.save.unlockedStageIds, unlockedStageId]
      : state.save.unlockedStageIds,
    currentStageId: unlockedStageId ?? stageId,
  };
  return {
    ...state,
    save,
    screen: "result",
    session: null,
    result: {
      stage: state.session.stage,
      earned: {
        coins: state.session.earned.coins + bonus.coins,
        xp: state.session.earned.xp + bonus.xp,
      },
      unlockedStageId,
      accuracy: stageAccuracy(attempts, stageId),
      playSummary,
      newlyEarnedMedals: medalAward.newlyEarned,
    },
  };
}

export function gameReducer(state, action) {
  switch (action.type) {
    case "START_STAGE":
      return startStage(state, action.stageId);
    case "DEV_START_STAGE":
      return startStage(state, action.stageId, true);
    case "TYPE_KEY": {
      if (state.screen !== "typing" || !state.session || state.session.attempt.completed) return state;
      const { attempt, result } = submitKey(state.session.attempt, action.key, action.now);
      if (result.completed) return completeProblem(state, attempt, result.durationMs);
      return {
        ...state,
        session: {
          ...state.session,
          attempt,
          feedback: result.accepted ? "" : "だいじょうぶ。吹き出しの指を、ゆっくり見よう。",
        },
      };
    }
    case "AUTO_ADVANCE": {
      if (!state.session?.attempt.completed) return state;
      if (state.session.index + 1 >= state.session.problems.length) return finishPlay(state);
      const index = state.session.index + 1;
      return {
        ...state,
        session: {
          ...state.session,
          index,
          attempt: startAttempt(state.session.problems[index]),
          feedback: "",
        },
      };
    }
    case "SHOW_MAP":
      return { ...state, screen: "map", session: null, result: null, message: "" };
    case "SHOW_WARDROBE":
      return { ...state, screen: "wardrobe", session: null, message: "" };
    case "SHOW_SETTINGS":
      return { ...state, screen: "settings", session: null, message: "" };
    case "TOGGLE_GUIDE":
      return { ...state, save: { ...state.save, settings: { ...state.save.settings, keyboardGuide: !state.save.settings.keyboardGuide } } };
    case "TOGGLE_MOTION":
      return { ...state, save: { ...state.save, settings: { ...state.save.settings, reducedMotion: !state.save.settings.reducedMotion } } };
    case "PURCHASE_OR_EQUIP": {
      const item = getItem(action.itemId);
      if (!item) return state;
      if (state.save.ownedItemIds.includes(item.id)) {
        return { ...state, save: equip(state.save, item.id), message: `${item.name}を つけたよ。` };
      }
      const outcome = purchase(state.save, item.id);
      return outcome.ok
        ? { ...state, save: outcome.save, message: `${item.name}を みつけたよ。` }
        : { ...state, message: outcome.reason };
    }
    case "RESET":
      return createGameState(createSave());
    default:
      return state;
  }
}
