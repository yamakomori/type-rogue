import { existsSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { STAGES } from "../src/domain/curriculum.js";
import { FISH_SPECIES } from "../src/domain/fish.js";
import { PROBLEMS } from "../src/domain/problems.js";
import { REGIONS } from "../src/domain/regions.js";
import { RomajiMatcher, validateKana } from "../src/domain/romaji.js";
import { COMMON_CONTENT_RULES, REGION_CONTENT_RULES } from "./content-rules.js";

// コンテンツ検証の本体。海域を名指しせず、content-rules.js の規約表だけを読む。
// 海域を追加するときに触るのは規約表であって、このファイルではない。
export function collectContentErrors({
  stages = STAGES,
  regions = REGIONS,
  problems = PROBLEMS,
  fishSpecies = FISH_SPECIES,
  regionRules = REGION_CONTENT_RULES,
  common = COMMON_CONTENT_RULES,
} = {}) {
  const errors = [];
  const stageById = new Map(stages.map((stage) => [stage.id, stage]));
  const regionById = new Map(regions.map((region) => [region.id, region]));
  const lessonRoles = new Set(common.lessonRoles);

  const rulesFor = (stage) => {
    const region = regionRules[stage?.regionId] ?? {};
    const stageEntry = region.stages?.[stage?.id];
    return {
      region,
      // problemRules は海域の全ステージへ、stageDefaults は規約表に載せたステージだけへ適用する。
      problemRules: region.problemRules ?? {},
      stageRules: stageEntry ? { ...(region.stageDefaults ?? {}), ...stageEntry } : {},
      label: region.messageLabel ?? regionById.get(stage?.regionId)?.name ?? stage?.regionId,
    };
  };

  checkStages(errors, { stages, regionById, lessonRoles });
  checkRegionStageLinks(errors, { regions, stageById });
  checkFish(errors, { fishSpecies, regionById, stageById, common });
  checkFishRoster(errors, { regions, fishSpecies, common });
  checkProblems(errors, { problems, stageById, lessonRoles, common, rulesFor });
  checkDuplicateInputs(errors, { problems, stageById, rulesFor });
  checkStageTotals(errors, { stages, problems, common, rulesFor });

  return errors;
}

function checkStages(errors, { stages, regionById, lessonRoles }) {
  for (const stage of stages) {
    if (!stage.id || !stage.name || stage.availableKeys.length === 0) errors.push(`ステージ定義が不完全: ${stage.id}`);
    if (!stage.regionId || !regionById.has(stage.regionId)) errors.push(`ステージの海域が不正: ${stage.id}`);
    if (!Number.isInteger(stage.order)) errors.push(`ステージ順が不正: ${stage.id}`);
    if (!Number.isInteger(stage.problemCount) || stage.problemCount < 1) errors.push(`1回の問題数が不正: ${stage.id}`);
    if (stage.lessonPlan) {
      if (stage.lessonPlan.length !== stage.problemCount) errors.push(`${stage.id}: lessonPlanと問題数が不一致`);
      if (!stage.lessonPlan.every((role) => lessonRoles.has(role))) errors.push(`${stage.id}: lessonPlanに未知の役割がある`);
    }
    const criteria = stage.medalCriteria;
    if (!criteria || !(criteria.carefulMinAccuracy > 0 && criteria.carefulMinAccuracy <= 1) || !(criteria.speedMaxMsPerKey > 0)) {
      errors.push(`メダル基準が不正: ${stage.id}`);
    }
  }
}

function checkRegionStageLinks(errors, { regions, stageById }) {
  for (const region of regions) {
    for (const stageId of region.stageIds) {
      const stage = stageById.get(stageId);
      if (!stage || stage.regionId !== region.id) errors.push(`海域とステージの参照が不正: ${region.id} → ${stageId}`);
    }
  }
}

function checkFish(errors, { fishSpecies, regionById, stageById, common }) {
  for (const fish of fishSpecies) {
    if (!regionById.has(fish.regionId)) errors.push(`魚の海域が不正: ${fish.id}`);
    for (const stageId of fish.stages) {
      if (stageById.get(stageId)?.regionId !== fish.regionId) errors.push(`魚とステージの海域が不一致: ${fish.id} → ${stageId}`);
    }
    if (!fish.sprite) continue;
    if (!fish.sprite.src?.startsWith("/sprites/") || !fish.sprite.src.endsWith(".png")) errors.push(`${fish.id}: スプライトパスが不正`);
    if (fish.sprite.frames !== common.spriteFrames) errors.push(`${fish.id}: 現在の描画が対応しないコマ数 ${fish.sprite.frames}`);
    if (!Number.isFinite(fish.sprite.frameMs) || fish.sprite.frameMs < common.minSpriteFrameMs) errors.push(`${fish.id}: スプライト速度が不正`);
    if (fish.sprite.sourceFacing !== "right") errors.push(`${fish.id}: スプライトの向きが不正`);
    const spritePath = join(process.cwd(), "public", fish.sprite.src.replace(/^\//, ""));
    if (!existsSync(spritePath)) errors.push(`${fish.id}: スプライトファイルが見つからない ${fish.sprite.src}`);
  }
}

// 各海域は「通常10種＋レア2種＝12種」で構成する。
function checkFishRoster(errors, { regions, fishSpecies, common }) {
  for (const region of regions) {
    const regionFish = fishSpecies.filter((fish) => fish.regionId === region.id);
    const rareCount = regionFish.filter((fish) => fish.rarity === "rare").length;
    if (regionFish.length !== common.fishPerRegion) errors.push(`海域の魚種数が12種でない: ${region.id} → ${regionFish.length}種`);
    if (rareCount !== common.rareFishPerRegion) errors.push(`海域のレア魚が2種でない: ${region.id} → ${rareCount}種`);
    // 通常魚はすべてのステージへ最低1種割り当てる（捕獲サイクルの穴を防ぐ）。
    for (const stageId of region.stageIds) {
      const hasNormal = regionFish.some((fish) => fish.rarity !== "rare" && fish.stages.includes(stageId));
      if (!hasNormal) errors.push(`通常魚が割り当てられていないステージ: ${stageId}`);
    }
  }
}

function checkProblems(errors, { problems, stageById, lessonRoles, common, rulesFor }) {
  const ids = new Set();
  const inputsByStage = new Map();

  for (const problem of problems) {
    if (ids.has(problem.id)) errors.push(`問題IDが重複: ${problem.id}`);
    ids.add(problem.id);
    const stage = stageById.get(problem.stageId);
    if (!stage) { errors.push(`存在しないステージを参照: ${problem.id} → ${problem.stageId}`); continue; }

    checkProblemBasics(errors, { problem, stage, lessonRoles, common });
    checkProblemInput(errors, { problem, stage });
    checkProblemAgainstRules(errors, { problem, stage, rulesFor });

    const stageInputs = inputsByStage.get(problem.stageId) ?? new Set();
    if (stageInputs.has(problem.input)) errors.push(`${problem.id}: 同ステージ内で入力が重複 (${problem.input})`);
    stageInputs.add(problem.input);
    inputsByStage.set(problem.stageId, stageInputs);
  }
}

function checkProblemBasics(errors, { problem, stage, lessonRoles, common }) {
  if (!problem.title || !problem.text || !problem.input || !problem.inputMode) errors.push(`問題の必須項目が不足: ${problem.id}`);
  if (!Array.isArray(problem.targetKeys) || problem.targetKeys.length === 0) errors.push(`targetKeysが不足: ${problem.id}`);
  if (problem.lessonRole && !lessonRoles.has(problem.lessonRole)) errors.push(`${problem.id}: 未知のlessonRole ${problem.lessonRole}`);
  if (problem.learningTags && !problem.learningTags.every((tag) => problem.tags?.includes(tag))) errors.push(`${problem.id}: learningTagsがtagsに含まれていない`);
  for (const tag of problem.learningTags ?? []) {
    const pattern = common.learningTagPatterns[tag];
    if (pattern && !pattern.test(problem.input)) errors.push(`${problem.id}: 学習タグ ${tag} と入力が不一致`);
  }
  for (const key of problem.targetKeys) {
    if (!stage.availableKeys.includes(key)) errors.push(`${problem.id}: 未解禁キー ${key}`);
  }
}

function checkProblemInput(errors, { problem, stage }) {
  if (problem.inputMode === "ja-romaji") {
    if (!problem.preferredInput) errors.push(`${problem.id}: preferredInputが不足`);
    const preferredKeys = [...new Set([...(problem.preferredInput ?? "")])];
    if (preferredKeys.join("") !== problem.targetKeys.join("")) errors.push(`${problem.id}: targetKeysとpreferredInputが不一致`);
    if (problem.estimatedKeystrokes !== problem.preferredInput?.length) errors.push(`${problem.id}: estimatedKeystrokesとpreferredInputが不一致`);
    const checked = validateKana(problem.input);
    if (!checked.valid) errors.push(`${problem.id}: 入力できないかな ${checked.char} (pos ${checked.pos})`);
    // ローマ字ガイドの表示どおりに打ち切れること、その結果が推奨綴りと一致すること。
    const matcher = new RomajiMatcher();
    matcher.load(problem.input);
    let guideSteps = 0;
    let guidedInput = "";
    while (!matcher.done && guideSteps < 200) {
      guideSteps += 1;
      const next = matcher.display().next;
      if (!next || !matcher.handleChar(next).accepted) break;
      guidedInput += next;
    }
    if (!matcher.done) errors.push(`${problem.id}: ローマ字ガイドだけでは入力を完了できない`);
    if (problem.preferredInput && guidedInput !== problem.preferredInput) errors.push(`${problem.id}: 推奨ローマ字とガイドが不一致 (${problem.preferredInput} / ${guidedInput})`);
  } else if (problem.inputMode === "direct") {
    const unsupported = [...problem.input].filter((key) => key !== " " && !stage.availableKeys.includes(key));
    if (unsupported.length) errors.push(`${problem.id}: 未解禁の直接入力 ${[...new Set(unsupported)].join(", ")}`);
  } else {
    errors.push(`${problem.id}: 未知のinputMode ${problem.inputMode}`);
  }
}

function checkProblemAgainstRules(errors, { problem, stage, rulesFor }) {
  const { problemRules, stageRules } = rulesFor(stage);
  const exerciseKinds = stageRules.exerciseKinds ?? problemRules.exerciseKinds;

  if (problemRules.requireLessonRole && !problem.lessonRole) errors.push(`${problem.id}: lessonRoleが不足`);
  if (exerciseKinds && !exerciseKinds.includes(problem.exerciseKind)) errors.push(`${problem.id}: exerciseKindが不正`);

  if (stageRules.allowedKana) {
    const allowedKana = new Set(stageRules.allowedKana);
    const unsupported = [...problem.input].filter((char) => !allowedKana.has(char));
    if (unsupported.length) errors.push(`${problem.id}: ${problem.stageId}では未学習のかな ${[...new Set(unsupported)].join(", ")}`);
  }

  if (problemRules.inputPattern && !problemRules.inputPattern.pattern.test(problem.input)) {
    errors.push(`${problem.id}: ${problemRules.inputPattern.message}`);
  }
  if (stageRules.mainTag && !problem.learningTags?.includes(stageRules.mainTag)) {
    errors.push(`${problem.id}: 主学習タグ ${stageRules.mainTag} が不足`);
  }
  if (stageRules.inputLength) {
    const [min, max] = stageRules.inputLength;
    const inputLength = [...problem.input].length;
    if (inputLength < min || inputLength > max) errors.push(`${problem.id}: 入力長が範囲外 (${inputLength}/${min}〜${max})`);
  }
  if (stageRules.requiredPattern && !stageRules.requiredPattern.pattern.test(problem.input)) {
    errors.push(`${problem.id}: ${stageRules.requiredPattern.message}`);
  }
  if (stageRules.forbiddenPattern && stageRules.forbiddenPattern.pattern.test(problem.input)) {
    errors.push(`${problem.id}: ${stageRules.forbiddenPattern.message}`);
  }
}

// 入力の重複は2種類ある。
//   uniqueInputWithinRegion    … その海域の中で同じ入力を二度出さない（浅瀬の段階学習）
//   uniqueInputAcrossAllStages … 全ステージを通じて入力が唯一であること（新規に書き下ろす語）
function checkDuplicateInputs(errors, { problems, stageById, rulesFor }) {
  const seenInRegion = new Map();
  for (const problem of problems) {
    const stage = stageById.get(problem.stageId);
    if (!stage || !rulesFor(stage).problemRules.uniqueInputWithinRegion) continue;
    const key = `${stage.regionId} ${problem.input}`;
    const previousId = seenInRegion.get(key);
    if (previousId) errors.push(`${problem.id}: 段階学習内で入力が重複 (${previousId} / ${problem.input})`);
    seenInRegion.set(key, problem.id);
  }

  const owners = new Map();
  for (const problem of problems.filter((item) => item.inputMode === "ja-romaji")) {
    owners.set(problem.input, [...(owners.get(problem.input) ?? []), problem]);
  }
  for (const [input, sharing] of owners) {
    if (sharing.length < 2) continue;
    const claimant = sharing.find((problem) => {
      const stage = stageById.get(problem.stageId);
      return stage && rulesFor(stage).stageRules.uniqueInputAcrossAllStages;
    });
    if (!claimant) continue;
    const label = rulesFor(stageById.get(claimant.stageId)).label;
    errors.push(`${label}の入力が既存問題と重複 (${input}: ${sharing.map((problem) => problem.id).join(" / ")})`);
  }
}

function checkStageTotals(errors, { stages, problems, common, rulesFor }) {
  for (const stage of stages) {
    const stageProblems = problems.filter((problem) => problem.stageId === stage.id);
    const count = stageProblems.length;
    const { problemRules, stageRules, label } = rulesFor(stage);
    const countByRole = (role) => stageProblems.filter((problem) => problem.lessonRole === role).length;

    if (problemRules.requireAllowedKana && !stageRules.allowedKana) {
      errors.push(`${stage.id}: 学習済みかなが規約表に未定義`);
    }
    if (count < common.minProblemsPerStage) errors.push(`${stage.id}: 問題数が不足 (${count}/${common.minProblemsPerStage})`);
    if (stageRules.problemCount != null && count !== stageRules.problemCount) {
      errors.push(`${stage.id}: 問題数が仕様と不一致 (${count}/${stageRules.problemCount})`);
    }
    for (const [role, minimum] of Object.entries(stageRules.roleMinimums ?? {})) {
      if (countByRole(role) < minimum) errors.push(`${stage.id}: ${role} 問題が${label}基準未満 (${countByRole(role)}/${minimum})`);
    }
    // 1プレイぶんの lessonPlan を、重複なしで組めるだけの在庫があること。
    for (const [role, required] of Object.entries(countRoles(stage.lessonPlan ?? []))) {
      if (countByRole(role) < required) errors.push(`${stage.id}: ${role} 問題が不足 (${countByRole(role)}/${required})`);
    }
    for (const tag of stage.focusTags ?? []) {
      if (!stageProblems.some((problem) => problem.learningTags?.includes(tag))) errors.push(`${stage.id}: 学習タグ ${tag} の問題が不足`);
    }
  }
}

function countRoles(roles) {
  return roles.reduce((counts, role) => ({ ...counts, [role]: (counts[role] ?? 0) + 1 }), {});
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const errors = collectContentErrors();
  if (errors.length) {
    console.error(`コンテンツ検証エラー ${errors.length} 件`);
    errors.forEach((error) => console.error(`- ${error}`));
    process.exit(1);
  }
  console.log(`✅ コンテンツ検証完了: ${STAGES.length} ステージ / ${PROBLEMS.length} 問`);
}
