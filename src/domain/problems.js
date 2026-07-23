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
