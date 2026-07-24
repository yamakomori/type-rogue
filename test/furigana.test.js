import test from "node:test";
import assert from "node:assert/strict";
import { splitFuriganaSegments } from "../src/domain/furigana.js";

test("送り仮名を除き、漢字だけにルビを割り当てる", () => {
  assert.deepEqual(splitFuriganaSegments("潮だまり", "しおだまり"), [
    { text: "潮", reading: "しお" },
    { text: "だまり" },
  ]);
});

test("一つの語句にある複数の漢字部分を分ける", () => {
  assert.deepEqual(splitFuriganaSegments("海へ出かける", "うみへでかける"), [
    { text: "海", reading: "うみ" },
    { text: "へ" },
    { text: "出", reading: "で" },
    { text: "かける" },
  ]);
});

test("語句の先頭がひらがなでも読みを対応させる", () => {
  assert.deepEqual(splitFuriganaSegments("まだ会っていない魚", "まだあっていないさかな"), [
    { text: "まだ" },
    { text: "会", reading: "あ" },
    { text: "っていない" },
    { text: "魚", reading: "さかな" },
  ]);
});

test("漢字を含まない語句にはルビを付けない", () => {
  assert.deepEqual(splitFuriganaSegments("キーボードガイド", "きーぼーどがいど"), [
    { text: "キーボードガイド" },
  ]);
});
