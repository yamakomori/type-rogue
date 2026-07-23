const makeProblem = (id, stageId, title, input) => ({
  id,
  stageId,
  title,
  text: input.toUpperCase(),
  input,
  inputMode: "direct",
  targetKeys: [...new Set([...input.replace(/\s/g, "")])],
  tags: ["practice"],
  estimatedKeystrokes: input.replace(/\s/g, "").length,
});

const makeKanaProblem = (id, title, text, kana, targetKeys) => ({
  id,
  stageId: "S09",
  title,
  text,
  input: kana,
  inputMode: "ja-romaji",
  targetKeys,
  tags: ["word", "kana"],
  estimatedKeystrokes: targetKeys.length,
});

export const PROBLEMS = [
  makeProblem("s00-01", "S00", "ぽっちを みつけよう", "fj"),
  makeProblem("s00-02", "S00", "ゆっくり いったりきたり", "fjfj"),
  makeProblem("s00-03", "S00", "みぎから かえろう", "jffj"),
  makeProblem("s00-04", "S00", "ふたつの ひかり", "ffjj"),
  makeProblem("s00-05", "S00", "ちいさな みち", "fjfjfj"),
  makeProblem("s01-01", "S01", "ひだりの みち", "asdf"),
  makeProblem("s01-02", "S01", "ひとつずつ もどろう", "fdsa"),
  makeProblem("s01-03", "S01", "おうちを あるこう", "asfd"),
  makeProblem("s01-04", "S01", "みじかい リズム", "sadf"),
  makeProblem("s01-05", "S01", "やわらかい かぜ", "dfas"),
  makeProblem("s02-01", "S02", "みぎの みち", "jkl"),
  makeProblem("s02-02", "S02", "ひとつずつ もどろう", "lkj"),
  makeProblem("s02-03", "S02", "おうちを あるこう", "jlk"),
  makeProblem("s02-04", "S02", "みじかい リズム", "kjl"),
  makeProblem("s02-05", "S02", "ひかりを たどろう", "ljk"),
  makeProblem("s03-01", "S03", "ふたつの みち", "asdf jkl"),
  makeProblem("s03-02", "S03", "ひだりから みぎへ", "asdjkl"),
  makeProblem("s03-03", "S03", "かぜの ステップ", "fjdskl"),
  makeProblem("s03-04", "S03", "おうちの ダンス", "safjdl"),
  makeProblem("s03-05", "S03", "きらりの みち", "dfjkasl"),
  makeProblem("s03-06", "S03", "たからばこ", "asdf jkl asdf"),
  makeProblem("s04-01", "S04", "ひだりの 丘", "qwer"),
  makeProblem("s04-02", "S04", "のぼって もどろう", "trewq"),
  makeProblem("s04-03", "S04", "かぜの みち", "qwert"),
  makeProblem("s04-04", "S04", "おうちへ かえる", "fdsare"),
  makeProblem("s04-05", "S04", "ちいさな ステップ", "wqer"),
  makeProblem("s05-01", "S05", "みぎの 丘", "yuiop"),
  makeProblem("s05-02", "S05", "のぼって もどろう", "poiuy"),
  makeProblem("s05-03", "S05", "ひかりの みち", "yuiop"),
  makeProblem("s05-04", "S05", "おうちへ かえる", "jklui"),
  makeProblem("s05-05", "S05", "ちいさな ステップ", "uioy"),
  makeProblem("s06-01", "S06", "丘を つなごう", "qwer yuiop"),
  makeProblem("s06-02", "S06", "風の リズム", "tyu rew"),
  makeProblem("s06-03", "S06", "空の みち", "qwe yui"),
  makeProblem("s06-04", "S06", "両手の ダンス", "asdf jkl qwer"),
  makeProblem("s06-05", "S06", "ひかりの 橋", "tryu ioe"),
  makeProblem("s07-01", "S07", "ひだりの 小道", "zxcvb"),
  makeProblem("s07-02", "S07", "おりて もどろう", "bvcxz"),
  makeProblem("s07-03", "S07", "草の リズム", "zxcv"),
  makeProblem("s07-04", "S07", "まっすぐ あるこう", "asdf zxcv"),
  makeProblem("s07-05", "S07", "ちいさな 石", "cvbz"),
  makeProblem("s08-01", "S08", "みぎの 小道", "nm,./"),
  makeProblem("s08-02", "S08", "おりて もどろう", "/.,mn"),
  makeProblem("s08-03", "S08", "草の リズム", "nm,."),
  makeProblem("s08-04", "S08", "まっすぐ あるこう", "jkl nm,."),
  makeProblem("s08-05", "S08", "ちいさな 石", "m,n/."),
  makeKanaProblem("s09-01", "朝の ひかり", "あさ", "あさ", ["a", "s", "a"]),
  makeKanaProblem("s09-02", "小さな いす", "いす", "いす", ["i", "s", "u"]),
  makeKanaProblem("s09-03", "かさを ひらく", "かさ", "かさ", ["k", "a", "s", "a"]),
  makeKanaProblem("s09-04", "ねこが いる", "ねこ", "ねこ", ["n", "e", "k", "o"]),
  makeKanaProblem("s09-05", "花を みつけた", "はな", "はな", ["h", "a", "n", "a"]),
  makeKanaProblem("s09-06", "さかなの みち", "さかな", "さかな", ["s", "a", "k", "a", "n", "a"]),
  makeKanaProblem("s09-07", "ふくを えらぶ", "ふく", "ふく", ["f", "u", "k", "u"]),
  makeKanaProblem("s09-08", "たまごを みつけた", "たまご", "たまご", ["t", "a", "m", "a", "g", "o"]),
];

export function getProblemsForStage(stageId) {
  return PROBLEMS.filter((problem) => problem.stageId === stageId);
}

export function chooseProblems({ stageId, skills = {}, recentIds = [], count = 3 }) {
  const candidates = getProblemsForStage(stageId).filter(
    (problem) => !recentIds.includes(problem.id),
  );
  const pool = candidates.length >= count ? candidates : getProblemsForStage(stageId);
  const weighted = pool.map((problem) => {
    const weakness = problem.targetKeys.reduce(
      (sum, key) => sum + (skills[key]?.reviewWeight ?? 0),
      0,
    );
    return { problem, weight: 1 + weakness };
  });
  const selected = [];
  while (selected.length < Math.min(count, weighted.length)) {
    const total = weighted.reduce((sum, entry) => sum + entry.weight, 0);
    let ticket = Math.random() * total;
    const chosen = weighted.find((entry) => {
      ticket -= entry.weight;
      return ticket <= 0;
    }) ?? weighted[weighted.length - 1];
    selected.push(chosen.problem);
    weighted.splice(weighted.indexOf(chosen), 1);
  }
  return selected;
}
