import { REGION_CONTENT } from "../content/regions.js";

export const REGIONS = REGION_CONTENT;

export function getRegion(regionId) {
  return REGIONS.find((region) => region.id === regionId) ?? REGIONS[0];
}

export function getRegionForStage(stageId) {
  return REGIONS.find((region) => region.stageIds.includes(stageId)) ?? REGIONS[0];
}

export function getUnlockedRegions(unlockedStageIds = []) {
  return REGIONS.filter((region) => region.stageIds.some((stageId) => unlockedStageIds.includes(stageId)));
}
