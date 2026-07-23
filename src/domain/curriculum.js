export const STAGES = [
  {
    id: "S00",
    name: "はじまりのぽっち",
    description: "F と J のぽっちに、指をかえそう。",
    introducedKeys: ["f", "j"],
    availableKeys: ["f", "j"],
    minCompletedPlays: 1,
    minAccuracy: 0.8,
  },
  {
    id: "S01",
    name: "ひだりのリズム",
    description: "左手のおうちを、ゆっくりたどろう。",
    introducedKeys: ["a", "s", "d"],
    availableKeys: ["a", "s", "d", "f"],
    minCompletedPlays: 2,
    minAccuracy: 0.8,
  },
  {
    id: "S02",
    name: "みぎのリズム",
    description: "右手も、おうちに帰ってこられるかな。",
    introducedKeys: ["k", "l"],
    availableKeys: ["j", "k", "l"],
    minCompletedPlays: 2,
    minAccuracy: 0.8,
  },
  {
    id: "S03",
    name: "おうちのダンス",
    description: "左右の手で、小さな道をつなごう。",
    introducedKeys: ["a", "s", "d", "f", "j", "k", "l"],
    availableKeys: ["a", "s", "d", "f", "j", "k", "l"],
    minCompletedPlays: 3,
    minAccuracy: 0.82,
  },
];

export function getStage(stageId) {
  return STAGES.find((stage) => stage.id === stageId) ?? STAGES[0];
}

export function getNextStage(stageId) {
  const index = STAGES.findIndex((stage) => stage.id === stageId);
  return STAGES[index + 1] ?? null;
}
