import test from "node:test";
import assert from "node:assert/strict";
import { getFingerGuide } from "../src/domain/fingers.js";

test("home-position keys map to the correct hand and finger", () => {
  assert.deepEqual(getFingerGuide("f"), { key: "f", side: "left", finger: "index", label: "左手の人さし指" });
  assert.deepEqual(getFingerGuide("a"), { key: "a", side: "left", finger: "pinky", label: "左手の小指" });
  assert.deepEqual(getFingerGuide("j"), { key: "j", side: "right", finger: "index", label: "右手の人さし指" });
  assert.deepEqual(getFingerGuide("l"), { key: "l", side: "right", finger: "ring", label: "右手の薬指" });
});

test("space uses a thumb guide", () => {
  assert.deepEqual(getFingerGuide(" "), { key: " ", side: "both", finger: "thumb", label: "親指" });
});

test("the long vowel key uses the right pinky guide", () => {
  assert.deepEqual(getFingerGuide("-"), { key: "-", side: "right", finger: "pinky", label: "右手の小指" });
});
