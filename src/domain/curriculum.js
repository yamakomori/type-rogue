import { STAGE_CONTENT } from "../content/stages.js";

export const STAGES = STAGE_CONTENT;

export function getStage(stageId) {
  return STAGES.find((stage) => stage.id === stageId) ?? STAGES[0];
}

export function getNextStage(stageId) {
  const index = STAGES.findIndex((stage) => stage.id === stageId);
  return STAGES[index + 1] ?? null;
}
