export const FISH_SPECIES = [
  { id: "tide-goby", name: "ぽっちハゼ", habitat: "潮だまり", stages: ["S00"], color: "#f0a24c", accent: "#fff3d2", shape: "round" },
  { id: "tide-shrimp", name: "ひかりエビ", habitat: "潮だまり", stages: ["S00"], color: "#e97977", accent: "#ffe0ca", shape: "long" },
  { id: "left-damselfish", name: "みぎわスズメダイ", habitat: "浅瀬", stages: ["S01", "S02", "S03"], color: "#50a8b6", accent: "#d7f1e5", shape: "round" },
  { id: "shellfish", name: "しましまベラ", habitat: "浅瀬", stages: ["S01", "S02", "S03"], color: "#e8b84d", accent: "#6d8b84", shape: "long" },
  { id: "coral-fish", name: "さんごダイ", habitat: "珊瑚の森", stages: ["S04", "S05", "S06"], color: "#e97873", accent: "#fff2d9", shape: "round" },
  { id: "sea-glassfish", name: "あおひかり", habitat: "珊瑚の森", stages: ["S04", "S05", "S06"], color: "#729bc9", accent: "#d8f0ed", shape: "long" },
  { id: "grass-seahorse", name: "うみくさタツノオトシゴ", habitat: "海草原", stages: ["S07", "S08"], color: "#91ae70", accent: "#f3e6a1", shape: "tall" },
  { id: "moon-squid", name: "つきイカ", habitat: "海草原", stages: ["S07", "S08"], color: "#b6a2ca", accent: "#e9e6f5", shape: "tall" },
  { id: "deep-lantern", name: "あかりアンコウ", habitat: "ことばの深み", stages: ["S09"], color: "#7187a9", accent: "#f5cb6d", shape: "round" },
  { id: "deep-jelly", name: "よるクラゲ", habitat: "ことばの深み", stages: ["S09"], color: "#a98cc2", accent: "#d8f3f0", shape: "tall" },
];

export function getFishSpecies(speciesId) {
  return FISH_SPECIES.find((fish) => fish.id === speciesId) ?? FISH_SPECIES[0];
}

export function fishSpeciesForStages(stageIds = []) {
  return FISH_SPECIES.filter((fish) => fish.stages.some((stageId) => stageIds.includes(stageId)));
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

export function fishDiscovery(caughtFish = [], stageIds = []) {
  const species = fishSpeciesForStages(stageIds);
  const caughtIds = new Set(caughtFish.map((fish) => fish.speciesId));
  return {
    total: species.length,
    discovered: species.filter((fish) => caughtIds.has(fish.id)).length,
    species,
    counts: Object.fromEntries(species.map((fish) => [
      fish.id,
      caughtFish.filter((caught) => caught.speciesId === fish.id).length,
    ])),
  };
}
