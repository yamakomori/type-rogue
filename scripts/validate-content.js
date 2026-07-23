import { STAGES } from "../src/domain/curriculum.js";
import { PROBLEMS } from "../src/domain/problems.js";
import { validateKana } from "../src/domain/romaji.js";

const errors = [];
const stageById = new Map(STAGES.map((stage) => [stage.id, stage]));
const ids = new Set();
const inputsByStage = new Map();

for (const stage of STAGES) {
  if (!stage.id || !stage.name || stage.availableKeys.length === 0) errors.push(`ステージ定義が不完全: ${stage.id}`);
}

for (const problem of PROBLEMS) {
  if (ids.has(problem.id)) errors.push(`問題IDが重複: ${problem.id}`);
  ids.add(problem.id);
  const stage = stageById.get(problem.stageId);
  if (!stage) { errors.push(`存在しないステージを参照: ${problem.id} → ${problem.stageId}`); continue; }
  if (!problem.title || !problem.text || !problem.input || !problem.inputMode) errors.push(`問題の必須項目が不足: ${problem.id}`);
  if (!Array.isArray(problem.targetKeys) || problem.targetKeys.length === 0) errors.push(`targetKeysが不足: ${problem.id}`);
  for (const key of problem.targetKeys) {
    if (!stage.availableKeys.includes(key)) errors.push(`${problem.id}: 未解禁キー ${key}`);
  }
  if (problem.inputMode === "ja-romaji") {
    const checked = validateKana(problem.input);
    if (!checked.valid) errors.push(`${problem.id}: 入力できないかな ${checked.char} (pos ${checked.pos})`);
  } else if (problem.inputMode === "direct") {
    const unsupported = [...problem.input].filter((key) => key !== " " && !stage.availableKeys.includes(key));
    if (unsupported.length) errors.push(`${problem.id}: 未解禁の直接入力 ${[...new Set(unsupported)].join(", ")}`);
  } else {
    errors.push(`${problem.id}: 未知のinputMode ${problem.inputMode}`);
  }
  const stageInputs = inputsByStage.get(problem.stageId) ?? new Set();
  if (stageInputs.has(problem.input)) errors.push(`${problem.id}: 同ステージ内で入力が重複 (${problem.input})`);
  stageInputs.add(problem.input);
  inputsByStage.set(problem.stageId, stageInputs);
}

for (const stage of STAGES) {
  const count = PROBLEMS.filter((problem) => problem.stageId === stage.id).length;
  if (count < 8) errors.push(`${stage.id}: 問題数が不足 (${count}/8)`);
}

if (errors.length) {
  console.error(`コンテンツ検証エラー ${errors.length} 件`);
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log(`✅ コンテンツ検証完了: ${STAGES.length} ステージ / ${PROBLEMS.length} 問`);
