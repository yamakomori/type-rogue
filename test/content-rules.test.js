import test from "node:test";
import assert from "node:assert/strict";
import { STAGES } from "../src/domain/curriculum.js";
import { FISH_SPECIES } from "../src/domain/fish.js";
import { PROBLEMS } from "../src/domain/problems.js";
import { REGIONS } from "../src/domain/regions.js";
import { REGION_CONTENT_RULES } from "../scripts/content-rules.js";
import { collectContentErrors } from "../scripts/validate-content.js";

// 改変したコンテンツを検証にかけて、出たエラーを返す。
function errorsAfter(mutate) {
  const corpus = structuredClone({ STAGES, REGIONS, PROBLEMS, FISH_SPECIES });
  mutate(corpus);
  return collectContentErrors({
    stages: corpus.STAGES,
    regions: corpus.REGIONS,
    problems: corpus.PROBLEMS,
    fishSpecies: corpus.FISH_SPECIES,
  });
}

const problemIn = (corpus, id) => corpus.PROBLEMS.find((problem) => problem.id === id);

function assertReports(errors, fragment) {
  assert.ok(
    errors.some((error) => error.includes(fragment)),
    `「${fragment}」を含むエラーが出ていない。実際: ${errors.slice(0, 5).join(" / ") || "（エラーなし）"}`,
  );
}

test("現在のコンテンツは検証を通る", () => {
  assert.deepEqual(collectContentErrors(), []);
});

// 海域を追加したとき、規約表への登録忘れをここで止める。
test("すべての海域が規約表に登録されている", () => {
  for (const region of REGIONS) {
    assert.ok(
      Object.hasOwn(REGION_CONTENT_RULES, region.id),
      `海域 ${region.id} の規約が content-rules.js に無い`,
    );
  }
});

test("規約表のステージは実在し、その海域に属する", () => {
  for (const [regionId, rules] of Object.entries(REGION_CONTENT_RULES)) {
    for (const stageId of Object.keys(rules.stages ?? {})) {
      const stage = STAGES.find((item) => item.id === stageId);
      assert.ok(stage, `規約表のステージ ${stageId} が存在しない`);
      assert.equal(stage.regionId, regionId, `${stageId} は ${regionId} のステージではない`);
    }
  }
});

test("規約表にない海域IDを参照していない", () => {
  const regionIds = new Set(REGIONS.map((region) => region.id));
  for (const regionId of Object.keys(REGION_CONTENT_RULES)) {
    assert.ok(regionIds.has(regionId), `規約表の海域 ${regionId} が存在しない`);
  }
});

test("浅瀬は未学習のかなを弾く", () => {
  assertReports(
    errorsAfter((corpus) => { problemIn(corpus, "sh01-01").input = "かき"; }),
    "SH01では未学習のかな",
  );
});

test("浅瀬はステージをまたぐ入力の重複を弾く", () => {
  assertReports(
    errorsAfter((corpus) => { problemIn(corpus, "sh04-07").input = problemIn(corpus, "sh03-09").input; }),
    "段階学習内で入力が重複",
  );
});

test("SH10は濁音・半濁音の拗音を弾く", () => {
  assertReports(
    errorsAfter((corpus) => { problemIn(corpus, "sh10-01").input = "ぎゃく"; }),
    "SH11で学ぶ濁音・半濁音の拗音がSH10に含まれている",
  );
});

test("浅瀬のステージはallowedKanaの宣言を要求する", () => {
  const corpus = structuredClone({ STAGES, REGIONS, PROBLEMS, FISH_SPECIES });
  const regionRules = structuredClone(REGION_CONTENT_RULES);
  delete regionRules.shallows.stages.SH01.allowedKana;
  const errors = collectContentErrors({
    stages: corpus.STAGES,
    regions: corpus.REGIONS,
    problems: corpus.PROBLEMS,
    fishSpecies: corpus.FISH_SPECIES,
    regionRules,
  });
  assertReports(errors, "SH01: 学習済みかなが規約表に未定義");
});

test("珊瑚の森は入力長の範囲を弾く", () => {
  assertReports(
    errorsAfter((corpus) => { problemIn(corpus, "co06-01").input = "あさ"; }),
    "入力長が範囲外",
  );
});

test("珊瑚の森はひらがなと長音以外を弾く", () => {
  assertReports(
    errorsAfter((corpus) => { problemIn(corpus, "co03-04").input = "アカイ"; }),
    "入力にはひらがなと長音だけを使用する",
  );
});

test("珊瑚の森は主学習タグの欠落を弾く", () => {
  assertReports(
    errorsAfter((corpus) => {
      const problem = problemIn(corpus, "co03-03");
      problem.learningTags = problem.learningTags.filter((tag) => tag !== "word-descriptive");
    }),
    "主学習タグ word-descriptive が不足",
  );
});

test("CO04は特殊かなを含まない語を弾く", () => {
  assertReports(
    errorsAfter((corpus) => { problemIn(corpus, "co04-01").input = "あかさたな"; }),
    "CO04の特殊かなが不足",
  );
});

test("CO02以降は既存問題と入力が重複したら弾く", () => {
  assertReports(
    errorsAfter((corpus) => { problemIn(corpus, "co02-14").input = problemIn(corpus, "sh04-07").input; }),
    "の入力が既存問題と重複",
  );
});

// CO01 は浅瀬の語をそのまま復習する導入ステージなので、
// 入力の重複と役割下限の規約から意図的に外している。content-rules.js のコメントを参照。
test("CO01は浅瀬と入力が重複していても許される", () => {
  const shared = new Set(PROBLEMS.filter((problem) => problem.stageId.startsWith("SH")).map((problem) => problem.input));
  const co01 = PROBLEMS.filter((problem) => problem.stageId === "CO01");
  assert.ok(co01.some((problem) => shared.has(problem.input)), "CO01と浅瀬の語彙が重なっていない");
  assert.deepEqual(collectContentErrors(), []);
});

test("各海域は通常10種とレア2種で構成される", () => {
  assertReports(
    errorsAfter((corpus) => { corpus.FISH_SPECIES = corpus.FISH_SPECIES.filter((fish) => fish.id !== "clownfish"); }),
    "海域の魚種数が12種でない",
  );
  assertReports(
    errorsAfter((corpus) => { delete corpus.FISH_SPECIES.find((fish) => fish.id === "shallow-tenkey-crab").rarity; }),
    "海域のレア魚が2種でない",
  );
});

test("ステージごとの問題数の仕様を弾く", () => {
  assertReports(
    errorsAfter((corpus) => { corpus.PROBLEMS = corpus.PROBLEMS.filter((problem) => problem.id !== "co02-01"); }),
    "CO02: 問題数が仕様と不一致 (29/30)",
  );
});

test("役割ごとの問題在庫の下限を弾く", () => {
  assertReports(
    errorsAfter((corpus) => {
      for (const problem of corpus.PROBLEMS) {
        if (problem.stageId === "CO03" && problem.lessonRole === "treasure") problem.lessonRole = "practice";
      }
    }),
    "CO03: treasure 問題が",
  );
});
