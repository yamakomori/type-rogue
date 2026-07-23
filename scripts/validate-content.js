import { existsSync } from "node:fs";
import { join } from "node:path";
import { STAGES } from "../src/domain/curriculum.js";
import { FISH_SPECIES } from "../src/domain/fish.js";
import { PROBLEMS } from "../src/domain/problems.js";
import { REGIONS } from "../src/domain/regions.js";
import { RomajiMatcher, validateKana } from "../src/domain/romaji.js";

const errors = [];
const stageById = new Map(STAGES.map((stage) => [stage.id, stage]));
const regionById = new Map(REGIONS.map((region) => [region.id, region]));
const ids = new Set();
const inputsByStage = new Map();
const lessonRoles = new Set(["intro", "practice", "mixed", "treasure"]);
const learningTagPatterns = {
  hatsuon: /ん/,
  sokuon: /っ/,
  choon: /ー/,
  yoon: /[ゃゅょ]/,
  "dakuon-yoon": /[ぎじぢびぴ][ゃゅょ]/,
};
const shallowProblemCounts = {
  SH01: 18,
  SH02: 20,
  SH03: 24,
  SH04: 24,
  SH05: 24,
  SH06: 30,
  SH07: 24,
  SH08: 24,
  SH09: 24,
  SH10: 30,
  SH11: 30,
};
const coralPhaseRules = {
  CO02: { count: 30, minLength: 2, maxLength: 5, tag: "word-verb", kinds: ["word"] },
  CO03: { count: 30, minLength: 2, maxLength: 6, tag: "word-descriptive", kinds: ["word"] },
  CO04: { count: 30, minLength: 3, maxLength: 8, tag: "mixed-kana-word", kinds: ["word"] },
  CO05: { count: 30, minLength: 5, maxLength: 10, tag: "phrase-particle", kinds: ["phrase"] },
  CO06: { count: 30, minLength: 7, maxLength: 12, tag: "coral-challenge", kinds: ["word", "phrase"] },
};
const shallowKanaByStage = {
  SH01: "あいうえお",
  SH02: "あいうえおかきくけこ",
  SH03: "あいうえおかきくけこさしすせそたちつてと",
  SH04: "あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめも",
  SH05: "あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわを",
  SH06: "あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわをがぎぐげござじずぜぞだぢづでどばびぶべぼぱぴぷぺぽ",
  SH07: "あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわをがぎぐげござじずぜぞだぢづでどばびぶべぼぱぴぷぺぽん",
  SH08: "あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわをがぎぐげござじずぜぞだぢづでどばびぶべぼぱぴぷぺぽんっ",
  SH09: "あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわをがぎぐげござじずぜぞだぢづでどばびぶべぼぱぴぷぺぽんっー",
  SH10: "あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわをがぎぐげござじずぜぞだぢづでどばびぶべぼぱぴぷぺぽんっーゃゅょ",
  SH11: "あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわをがぎぐげござじずぜぞだぢづでどばびぶべぼぱぴぷぺぽんっーゃゅょ",
};

for (const stage of STAGES) {
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

for (const region of REGIONS) {
  for (const stageId of region.stageIds) {
    const stage = stageById.get(stageId);
    if (!stage || stage.regionId !== region.id) errors.push(`海域とステージの参照が不正: ${region.id} → ${stageId}`);
  }
}

for (const fish of FISH_SPECIES) {
  if (!regionById.has(fish.regionId)) errors.push(`魚の海域が不正: ${fish.id}`);
  for (const stageId of fish.stages) {
    if (stageById.get(stageId)?.regionId !== fish.regionId) errors.push(`魚とステージの海域が不一致: ${fish.id} → ${stageId}`);
  }
  if (fish.sprite) {
    if (!fish.sprite.src?.startsWith("/sprites/") || !fish.sprite.src.endsWith(".png")) errors.push(`${fish.id}: スプライトパスが不正`);
    if (fish.sprite.frames !== 4) errors.push(`${fish.id}: 現在の描画が対応しないコマ数 ${fish.sprite.frames}`);
    if (!Number.isFinite(fish.sprite.frameMs) || fish.sprite.frameMs < 100) errors.push(`${fish.id}: スプライト速度が不正`);
    if (fish.sprite.sourceFacing !== "right") errors.push(`${fish.id}: スプライトの向きが不正`);
    const spritePath = join(process.cwd(), "public", fish.sprite.src.replace(/^\//, ""));
    if (!existsSync(spritePath)) errors.push(`${fish.id}: スプライトファイルが見つからない ${fish.sprite.src}`);
  }
}

for (const problem of PROBLEMS) {
  if (ids.has(problem.id)) errors.push(`問題IDが重複: ${problem.id}`);
  ids.add(problem.id);
  const stage = stageById.get(problem.stageId);
  if (!stage) { errors.push(`存在しないステージを参照: ${problem.id} → ${problem.stageId}`); continue; }
  if (!problem.title || !problem.text || !problem.input || !problem.inputMode) errors.push(`問題の必須項目が不足: ${problem.id}`);
  if (!Array.isArray(problem.targetKeys) || problem.targetKeys.length === 0) errors.push(`targetKeysが不足: ${problem.id}`);
  if (problem.lessonRole && !lessonRoles.has(problem.lessonRole)) errors.push(`${problem.id}: 未知のlessonRole ${problem.lessonRole}`);
  if (problem.learningTags && !problem.learningTags.every((tag) => problem.tags?.includes(tag))) errors.push(`${problem.id}: learningTagsがtagsに含まれていない`);
  for (const tag of problem.learningTags ?? []) {
    if (learningTagPatterns[tag] && !learningTagPatterns[tag].test(problem.input)) errors.push(`${problem.id}: 学習タグ ${tag} と入力が不一致`);
  }
  for (const key of problem.targetKeys) {
    if (!stage.availableKeys.includes(key)) errors.push(`${problem.id}: 未解禁キー ${key}`);
  }
  if (problem.inputMode === "ja-romaji") {
    if (!problem.preferredInput) errors.push(`${problem.id}: preferredInputが不足`);
    const preferredKeys = [...new Set([...(problem.preferredInput ?? "")])];
    if (preferredKeys.join("") !== problem.targetKeys.join("")) errors.push(`${problem.id}: targetKeysとpreferredInputが不一致`);
    if (problem.estimatedKeystrokes !== problem.preferredInput?.length) errors.push(`${problem.id}: estimatedKeystrokesとpreferredInputが不一致`);
    const checked = validateKana(problem.input);
    if (!checked.valid) errors.push(`${problem.id}: 入力できないかな ${checked.char} (pos ${checked.pos})`);
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
  if (problem.stageId.startsWith("SH")) {
    if (!problem.lessonRole) errors.push(`${problem.id}: lessonRoleが不足`);
    if (!["pattern", "word"].includes(problem.exerciseKind)) errors.push(`${problem.id}: exerciseKindが不正`);
    const allowedKana = new Set(shallowKanaByStage[problem.stageId] ?? "");
    const unsupportedKana = [...problem.input].filter((char) => !allowedKana.has(char));
    if (unsupportedKana.length) errors.push(`${problem.id}: ${problem.stageId}では未学習のかな ${[...new Set(unsupportedKana)].join(", ")}`);
    if (problem.stageId === "SH10" && /[ぎじぢびぴ][ゃゅょ]/.test(problem.input)) {
      errors.push(`${problem.id}: SH11で学ぶ濁音・半濁音の拗音がSH10に含まれている`);
    }
  }
  const coralRule = coralPhaseRules[problem.stageId];
  if (coralRule) {
    const inputLength = [...problem.input].length;
    if (!problem.lessonRole) errors.push(`${problem.id}: lessonRoleが不足`);
    if (!coralRule.kinds.includes(problem.exerciseKind)) errors.push(`${problem.id}: exerciseKindが不正`);
    if (!problem.learningTags?.includes(coralRule.tag)) errors.push(`${problem.id}: 主学習タグ ${coralRule.tag} が不足`);
    if (!/^[ぁ-んー]+$/.test(problem.input)) errors.push(`${problem.id}: 入力にはひらがなと長音だけを使用する`);
    if (inputLength < coralRule.minLength || inputLength > coralRule.maxLength) {
      errors.push(`${problem.id}: 入力長が範囲外 (${inputLength}/${coralRule.minLength}〜${coralRule.maxLength})`);
    }
    if (problem.stageId === "CO04" && !/[んっーゃゅょ]/.test(problem.input)) {
      errors.push(`${problem.id}: CO04の特殊かなが不足`);
    }
  }
  const stageInputs = inputsByStage.get(problem.stageId) ?? new Set();
  if (stageInputs.has(problem.input)) errors.push(`${problem.id}: 同ステージ内で入力が重複 (${problem.input})`);
  stageInputs.add(problem.input);
  inputsByStage.set(problem.stageId, stageInputs);
}

const progressiveInputs = new Map();
for (const problem of PROBLEMS.filter((item) => item.stageId.startsWith("SH"))) {
  const previousId = progressiveInputs.get(problem.input);
  if (previousId) errors.push(`${problem.id}: 段階学習内で入力が重複 (${previousId} / ${problem.input})`);
  progressiveInputs.set(problem.input, problem.id);
}

const japaneseInputOwners = new Map();
for (const problem of PROBLEMS.filter((item) => item.inputMode === "ja-romaji")) {
  const owners = japaneseInputOwners.get(problem.input) ?? [];
  owners.push(problem);
  japaneseInputOwners.set(problem.input, owners);
}
for (const [input, owners] of japaneseInputOwners) {
  if (owners.length > 1 && owners.some((problem) => coralPhaseRules[problem.stageId])) {
    errors.push(`Phase 2の入力が既存問題と重複 (${input}: ${owners.map((problem) => problem.id).join(" / ")})`);
  }
}

for (const stage of STAGES) {
  const stageProblems = PROBLEMS.filter((problem) => problem.stageId === stage.id);
  const count = stageProblems.length;
  if (count < 8) errors.push(`${stage.id}: 問題数が不足 (${count}/8)`);
  if (shallowProblemCounts[stage.id] && count !== shallowProblemCounts[stage.id]) {
    errors.push(`${stage.id}: 問題数が仕様と不一致 (${count}/${shallowProblemCounts[stage.id]})`);
  }
  const coralRule = coralPhaseRules[stage.id];
  if (coralRule && count !== coralRule.count) {
    errors.push(`${stage.id}: 問題数が仕様と不一致 (${count}/${coralRule.count})`);
  }
  if (coralRule) {
    const roleMinimums = { intro: 4, practice: 12, mixed: 6, treasure: 4 };
    for (const [role, minimum] of Object.entries(roleMinimums)) {
      const available = stageProblems.filter((problem) => problem.lessonRole === role).length;
      if (available < minimum) errors.push(`${stage.id}: ${role} 問題がPhase 2基準未満 (${available}/${minimum})`);
    }
  }
  if (stage.lessonPlan) {
    const requiredByRole = stage.lessonPlan.reduce((counts, role) => {
      counts[role] = (counts[role] ?? 0) + 1;
      return counts;
    }, {});
    for (const [role, required] of Object.entries(requiredByRole)) {
      const available = stageProblems.filter((problem) => problem.lessonRole === role).length;
      if (available < required) errors.push(`${stage.id}: ${role} 問題が不足 (${available}/${required})`);
    }
  }
  for (const tag of stage.focusTags ?? []) {
    if (!stageProblems.some((problem) => problem.learningTags?.includes(tag))) errors.push(`${stage.id}: 学習タグ ${tag} の問題が不足`);
  }
}

if (errors.length) {
  console.error(`コンテンツ検証エラー ${errors.length} 件`);
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log(`✅ コンテンツ検証完了: ${STAGES.length} ステージ / ${PROBLEMS.length} 問`);
