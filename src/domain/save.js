import { STARTER_EQUIPPED, STARTER_ITEMS } from "./economy.js";

const SAVE_KEY = "type-rogue-mvp-save-v1";

export function createSave() {
  return {
    schemaVersion: 1,
    medalRulesVersion: 4,
    currentStageId: "S00",
    unlockedStageIds: ["S00"],
    completedProblemIds: [],
    attempts: [],
    recentProblemIds: [],
    stagePlayCounts: {},
    stageMedals: {},
    caughtFish: [],
    discoveredFishSpeciesIds: [],
    releasedFishCounts: {},
    hasSeenIntro: false,
    skills: {},
    conceptSkills: {},
    coins: 0,
    xp: 0,
    ownedItemIds: STARTER_ITEMS,
    equipped: STARTER_EQUIPPED,
    settings: { keyboardGuide: true, sound: false, reducedMotion: false },
  };
}

export function loadSave(storage = localStorage) {
  try {
    const raw = storage.getItem(SAVE_KEY);
    if (!raw) return createSave();
    const saved = JSON.parse(raw);
    if (saved.schemaVersion !== 1) return createSave();
    const defaults = createSave();
    const merged = {
      ...defaults,
      ...saved,
      discoveredFishSpeciesIds: saved.discoveredFishSpeciesIds ?? [...new Set((saved.caughtFish ?? []).map((fish) => fish.speciesId))],
      releasedFishCounts: { ...defaults.releasedFishCounts, ...saved.releasedFishCounts },
      conceptSkills: { ...defaults.conceptSkills, ...saved.conceptSkills },
      settings: { ...defaults.settings, ...saved.settings },
    };
    return saved.medalRulesVersion === defaults.medalRulesVersion
      ? merged
      : { ...merged, medalRulesVersion: defaults.medalRulesVersion, stageMedals: {} };
  } catch {
    return createSave();
  }
}

export function persistSave(save, storage = localStorage) {
  storage.setItem(SAVE_KEY, JSON.stringify(save));
}

export function resetSave(storage = localStorage) {
  const save = createSave();
  persistSave(save, storage);
  return save;
}
