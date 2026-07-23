const FINGERS = {
  q: ["left", "pinky", "左手の小指"], a: ["left", "pinky", "左手の小指"], z: ["left", "pinky", "左手の小指"],
  w: ["left", "ring", "左手の薬指"], s: ["left", "ring", "左手の薬指"], x: ["left", "ring", "左手の薬指"],
  e: ["left", "middle", "左手の中指"], d: ["left", "middle", "左手の中指"], c: ["left", "middle", "左手の中指"],
  r: ["left", "index", "左手の人さし指"], f: ["left", "index", "左手の人さし指"], v: ["left", "index", "左手の人さし指"],
  t: ["left", "index", "左手の人さし指"], g: ["left", "index", "左手の人さし指"], b: ["left", "index", "左手の人さし指"],
  y: ["right", "index", "右手の人さし指"], h: ["right", "index", "右手の人さし指"], n: ["right", "index", "右手の人さし指"],
  u: ["right", "index", "右手の人さし指"], j: ["right", "index", "右手の人さし指"], m: ["right", "index", "右手の人さし指"],
  i: ["right", "middle", "右手の中指"], k: ["right", "middle", "右手の中指"], ",": ["right", "middle", "右手の中指"],
  o: ["right", "ring", "右手の薬指"], l: ["right", "ring", "右手の薬指"], ".": ["right", "ring", "右手の薬指"],
  p: ["right", "pinky", "右手の小指"], ";": ["right", "pinky", "右手の小指"], "/": ["right", "pinky", "右手の小指"],
  " ": ["both", "thumb", "親指"],
};

export function getFingerGuide(key) {
  const [side, finger, label] = FINGERS[key] ?? ["", "", ""];
  return { key, side, finger, label };
}
