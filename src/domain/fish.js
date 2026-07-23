export const FISH_SPECIES = [
  { id: "tide-goby", name: "ぽっちハゼ", habitat: "潮だまり", regionId: "tidepool", stages: ["S00"], color: "#f0a24c", accent: "#fff3d2", shape: "round" },
  { id: "tide-shrimp", name: "ひかりエビ", habitat: "潮だまり", regionId: "tidepool", stages: ["S00"], color: "#e97977", accent: "#ffe0ca", shape: "long" },
  { id: "left-damselfish", name: "みぎわスズメダイ", habitat: "潮だまり", regionId: "tidepool", stages: ["S01", "S02", "S03"], color: "#50a8b6", accent: "#d7f1e5", shape: "round" },
  { id: "shellfish", name: "しましまベラ", habitat: "潮だまり", regionId: "tidepool", stages: ["S01", "S02", "S03"], color: "#e8b84d", accent: "#6d8b84", shape: "long" },
  { id: "coral-fish", name: "さんごダイ", habitat: "潮だまり", regionId: "tidepool", stages: ["S04", "S05", "S06"], color: "#e97873", accent: "#fff2d9", shape: "round" },
  { id: "sea-glassfish", name: "あおひかり", habitat: "潮だまり", regionId: "tidepool", stages: ["S04", "S05", "S06"], color: "#729bc9", accent: "#d8f0ed", shape: "long" },
  { id: "grass-seahorse", name: "うみくさタツノオトシゴ", habitat: "潮だまり", regionId: "tidepool", stages: ["S07", "S08"], color: "#91ae70", accent: "#f3e6a1", shape: "tall" },
  { id: "moon-squid", name: "つきイカ", habitat: "潮だまり", regionId: "tidepool", stages: ["S07", "S08"], color: "#b6a2ca", accent: "#e9e6f5", shape: "tall" },
  { id: "deep-lantern", name: "あかりアンコウ", habitat: "潮だまり", regionId: "tidepool", stages: ["S09"], color: "#7187a9", accent: "#f5cb6d", shape: "round" },
  { id: "deep-jelly", name: "よるクラゲ", habitat: "潮だまり", regionId: "tidepool", stages: ["S09"], color: "#a98cc2", accent: "#d8f3f0", shape: "tall" },
  { id: "shallow-puffer", name: "ぷくぷくフグ", habitat: "浅瀬", regionId: "shallows", stages: ["S10"], color: "#e7b955", accent: "#fff0ac", shape: "round" },
  { id: "sand-ray", name: "すなひかりエイ", habitat: "浅瀬", regionId: "shallows", stages: ["S10"], color: "#7db5a4", accent: "#d8f4df", shape: "long" },
  { id: "ribbon-eel", name: "ゆらりウツボ", habitat: "浅瀬", regionId: "shallows", stages: ["S11"], color: "#8f86ce", accent: "#e7defb", shape: "long" },
  { id: "bubble-jelly", name: "あわクラゲ", habitat: "浅瀬", regionId: "shallows", stages: ["S11"], color: "#ef8fa5", accent: "#ffe4eb", shape: "tall" },
];

export function getFishSpecies(speciesId) {
  return FISH_SPECIES.find((fish) => fish.id === speciesId) ?? FISH_SPECIES[0];
}

export function fishSpeciesForStages(stageIds = []) {
  return FISH_SPECIES.filter((fish) => fish.stages.some((stageId) => stageIds.includes(stageId)));
}

export function fishSpeciesForRegion(regionId) {
  return FISH_SPECIES.filter((fish) => fish.regionId === regionId);
}

export function fishForCatch({ stageId, playCount, medals = {} }) {
  const candidates = FISH_SPECIES.filter((fish) => fish.stages.includes(stageId));
  const species = candidates[(Math.max(playCount, 1) - 1) % candidates.length] ?? FISH_SPECIES[0];
  const variant = medals.gold ? "gold" : medals.speed ? "swift" : medals.careful ? "calm" : "common";
  const size = ["small", "medium", "large"][(Math.max(playCount, 1) - 1) % 3];
  return {
    id: `${stageId}-catch-${playCount}`,
    speciesId: species.id,
    stageId,
    regionId: species.regionId,
    variant,
    size,
  };
}

export function fishCollectionStats(caughtFish = []) {
  return {
    total: caughtFish.length,
    species: new Set(caughtFish.map((fish) => fish.speciesId)).size,
  };
}

export function fishDiscovery(discoveredSpeciesIds = [], stageIds = []) {
  const species = fishSpeciesForStages(stageIds);
  const discoveredIds = new Set(discoveredSpeciesIds);
  return {
    total: species.length,
    discovered: species.filter((fish) => discoveredIds.has(fish.id)).length,
    species,
  };
}

export function fishCountsBySpecies(caughtFish = []) {
  return caughtFish.reduce((counts, fish) => ({
    ...counts,
    [fish.speciesId]: (counts[fish.speciesId] ?? 0) + 1,
  }), {});
}

export function releaseFish(save, fishId) {
  const fish = save.caughtFish.find((caught) => caught.id === fishId);
  if (!fish) return save;
  const regionId = fish.regionId ?? getFishSpecies(fish.speciesId).regionId;
  return {
    ...save,
    caughtFish: save.caughtFish.filter((caught) => caught.id !== fishId),
    releasedFishCounts: {
      ...save.releasedFishCounts,
      [regionId]: (save.releasedFishCounts?.[regionId] ?? 0) + 1,
    },
  };
}
