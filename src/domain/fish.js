// 水槽での泳ぎ方・見え方の指定:
//   school: true  … 同種で群れる（小さくおとなしい魚向け）。大型やアンコウなどは指定しない。
//   depth: "top" | "mid"(既定) | "bottom" … 泳ぐ層。底生の魚は "bottom"、浮遊する魚は "top"。
//   scale: 数値(既定 1) … 水槽での大きさ倍率。1 を最小として、大型の魚だけ大きくする。
export const FISH_SPECIES = [
  { id: "tide-goby", name: "ぽっちハゼ", habitat: "潮だまり", regionId: "tidepool", stages: ["S00"], color: "#f0a24c", accent: "#fff3d2", shape: "round", depth: "bottom" },
  { id: "tide-shrimp", name: "ひかりエビ", habitat: "潮だまり", regionId: "tidepool", stages: ["S00"], color: "#e97977", accent: "#ffe0ca", shape: "long", depth: "bottom" },
  { id: "left-damselfish", name: "みぎわスズメダイ", habitat: "潮だまり", regionId: "tidepool", stages: ["S01", "S02", "S03"], color: "#50a8b6", accent: "#d7f1e5", shape: "round", school: true },
  { id: "shellfish", name: "しましまベラ", habitat: "潮だまり", regionId: "tidepool", stages: ["S01", "S02", "S03"], color: "#e8b84d", accent: "#6d8b84", shape: "long", rarity: "common", sprite: { src: "/sprites/striped-wrasse-strip.png", frames: 4, frameMs: 270, sourceFacing: "right" } },
  { id: "coral-fish", name: "さんごダイ", habitat: "潮だまり", regionId: "tidepool", stages: ["S04", "S05", "S06"], color: "#e97873", accent: "#fff2d9", shape: "round", school: true },
  { id: "sea-glassfish", name: "あおひかり", habitat: "潮だまり", regionId: "tidepool", stages: ["S04", "S05", "S06"], color: "#729bc9", accent: "#d8f0ed", shape: "long", school: true, depth: "top" },
  { id: "grass-seahorse", name: "うみくさタツノオトシゴ", habitat: "潮だまり", regionId: "tidepool", stages: ["S07", "S08"], color: "#91ae70", accent: "#f3e6a1", shape: "tall", movement: "drift", depth: "bottom" },
  { id: "moon-squid", name: "つきイカ", habitat: "潮だまり", regionId: "tidepool", stages: ["S07", "S08"], color: "#b6a2ca", accent: "#e9e6f5", shape: "tall", movement: "drift", depth: "top", scale: 1.2 },
  // 旧カリキュラムで捕まえた個体を図鑑と水槽に残すため、魚種IDは維持する。
  { id: "deep-lantern", name: "あかりアンコウ", habitat: "潮だまり", regionId: "tidepool", stages: ["S08"], color: "#7187a9", accent: "#f5cb6d", shape: "round", rarity: "rare", depth: "bottom", scale: 2, sprite: { src: "/sprites/key-angler-strip.png", frames: 4, frameMs: 350, sourceFacing: "right" } },
  { id: "deep-jelly", name: "よるクラゲ", habitat: "潮だまり", regionId: "tidepool", stages: ["S08"], color: "#a98cc2", accent: "#d8f3f0", shape: "tall", movement: "drift", depth: "top" },
  { id: "shallow-puffer", name: "ぷくぷくフグ", habitat: "浅瀬", regionId: "shallows", stages: ["SH01", "SH02"], color: "#e7b955", accent: "#fff0ac", shape: "round", rarity: "common", scale: 1.15, sprite: { src: "/sprites/minami-hakofugu-strip.png", frames: 4, frameMs: 250, sourceFacing: "right" } },
  { id: "clownfish", name: "カクレクマノミ", habitat: "浅瀬", regionId: "shallows", stages: ["SH01", "SH02"], color: "#ee7f36", accent: "#f7efe0", shape: "round", rarity: "common", school: true, sprite: { src: "/sprites/clownfish-strip.png", frames: 4, frameMs: 280, sourceFacing: "right" } },
  { id: "sand-ray", name: "すなひかりエイ", habitat: "浅瀬", regionId: "shallows", stages: ["SH03", "SH04"], color: "#7db5a4", accent: "#d8f4df", shape: "long", rarity: "common", depth: "bottom", scale: 1.5, sprite: { src: "/sprites/sand-ray-strip.png", frames: 4, frameMs: 300, sourceFacing: "right" } },
  { id: "ribbon-eel", name: "ゆらりウツボ", habitat: "浅瀬", regionId: "shallows", stages: ["SH05", "SH06"], color: "#8f86ce", accent: "#e7defb", shape: "long", depth: "bottom", scale: 1.35 },
  { id: "bubble-jelly", name: "あわクラゲ", habitat: "浅瀬", regionId: "shallows", stages: ["SH07"], color: "#ef8fa5", accent: "#ffe4eb", shape: "tall", movement: "drift", depth: "top" },
  { id: "shell-octopus", name: "かくれだこ", habitat: "浅瀬", regionId: "shallows", stages: ["SH08", "SH09"], color: "#d67b68", accent: "#ffe0c7", shape: "round", depth: "bottom", scale: 1.3 },
  { id: "sun-threadfish", name: "ひだまりイトヒキ", habitat: "浅瀬", regionId: "shallows", stages: ["SH10", "SH11"], color: "#edca5f", accent: "#fff6b8", shape: "long", school: true },
  { id: "coral-butterfly", name: "さんごチョウチョウウオ", habitat: "珊瑚の森", regionId: "coral-forest", stages: ["CO01", "CO02"], color: "#f19a5b", accent: "#fff0b8", shape: "round", rarity: "common", school: true, sprite: { src: "/sprites/coral-butterfly-strip.png", frames: 4, frameMs: 280, sourceFacing: "right" } },
  { id: "coral-cardinal", name: "こもれびテンジクダイ", habitat: "珊瑚の森", regionId: "coral-forest", stages: ["CO01", "CO03"], color: "#e86f75", accent: "#ffe5cb", shape: "long", school: true },
  { id: "coral-parrotfish", name: "にじいろブダイ", habitat: "珊瑚の森", regionId: "coral-forest", stages: ["CO04"], color: "#55b79f", accent: "#f2d479", shape: "round", scale: 1.2 },
  { id: "coral-cleaner-shrimp", name: "ことばエビ", habitat: "珊瑚の森", regionId: "coral-forest", stages: ["CO05"], color: "#ef8275", accent: "#fff0db", shape: "long", depth: "bottom" },
  { id: "coral-turtle", name: "もりのアオウミガメ", habitat: "珊瑚の森", regionId: "coral-forest", stages: ["CO06"], color: "#6caf83", accent: "#dff2a7", shape: "round", scale: 1.5 },
];

export const AQUARIUM_VISIBLE_FISH_LIMIT = 24;
export const AQUARIUM_COMPACT_VISIBLE_FISH_LIMIT = 12;

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

export function selectAquariumFish(caughtFish = [], limit = AQUARIUM_VISIBLE_FISH_LIMIT) {
  const visibleLimit = Math.max(0, Math.floor(limit));
  if (visibleLimit === 0 || caughtFish.length === 0) return [];

  const selectedIndices = [];
  const selectedIndexSet = new Set();
  const selectedSpeciesIds = new Set();

  // First keep the newest individual of as many different species as possible.
  for (let index = caughtFish.length - 1; index >= 0 && selectedIndices.length < visibleLimit; index -= 1) {
    const speciesId = caughtFish[index].speciesId;
    if (selectedSpeciesIds.has(speciesId)) continue;
    selectedSpeciesIds.add(speciesId);
    selectedIndices.push(index);
    selectedIndexSet.add(index);
  }

  // Use the remaining room for the newest duplicate individuals.
  for (let index = caughtFish.length - 1; index >= 0 && selectedIndices.length < visibleLimit; index -= 1) {
    if (selectedIndexSet.has(index)) continue;
    selectedIndices.push(index);
  }

  return selectedIndices
    .sort((left, right) => left - right)
    .map((index) => caughtFish[index]);
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
