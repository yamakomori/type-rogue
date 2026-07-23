const PREFERRED_ROMAJI = {
  あ: "a", い: "i", う: "u", え: "e", お: "o",
  か: "ka", き: "ki", く: "ku", け: "ke", こ: "ko",
  さ: "sa", し: "shi", す: "su", せ: "se", そ: "so",
  た: "ta", ち: "chi", つ: "tsu", て: "te", と: "to",
  な: "na", に: "ni", ぬ: "nu", ね: "ne", の: "no",
  は: "ha", ひ: "hi", ふ: "fu", へ: "he", ほ: "ho",
  ま: "ma", み: "mi", む: "mu", め: "me", も: "mo",
  や: "ya", ゆ: "yu", よ: "yo",
  ら: "ra", り: "ri", る: "ru", れ: "re", ろ: "ro",
  わ: "wa", を: "wo",
  が: "ga", ぎ: "gi", ぐ: "gu", げ: "ge", ご: "go",
  ざ: "za", じ: "ji", ず: "zu", ぜ: "ze", ぞ: "zo",
  だ: "da", ぢ: "di", づ: "du", で: "de", ど: "do",
  ば: "ba", び: "bi", ぶ: "bu", べ: "be", ぼ: "bo",
  ぱ: "pa", ぴ: "pi", ぷ: "pu", ぺ: "pe", ぽ: "po",
  きゃ: "kya", きゅ: "kyu", きょ: "kyo",
  しゃ: "sha", しゅ: "shu", しょ: "sho",
  ちゃ: "cha", ちゅ: "chu", ちょ: "cho",
  にゃ: "nya", にゅ: "nyu", にょ: "nyo",
  ひゃ: "hya", ひゅ: "hyu", ひょ: "hyo",
  みゃ: "mya", みゅ: "myu", みょ: "myo",
  りゃ: "rya", りゅ: "ryu", りょ: "ryo",
  ぎゃ: "gya", ぎゅ: "gyu", ぎょ: "gyo",
  じゃ: "ja", じゅ: "ju", じょ: "jo",
  ぢゃ: "dya", ぢゅ: "dyu", ぢょ: "dyo",
  びゃ: "bya", びゅ: "byu", びょ: "byo",
  ぴゃ: "pya", ぴゅ: "pyu", ぴょ: "pyo",
};

const N_BLOCKERS = "aiueony";

function preferredUnitAt(kana, pos) {
  const char = kana[pos];
  if (!char) return null;
  if (char === "ー") return { spelling: "-", kanaLength: 1 };
  if (char === "っ") {
    const next = preferredUnitAt(kana, pos + 1);
    if (!next) throw new Error(`「っ」の後ろに文字がありません: ${kana}`);
    return { spelling: next.spelling[0] + next.spelling, kanaLength: next.kanaLength + 1 };
  }
  if (char === "ん") {
    const next = preferredUnitAt(kana, pos + 1);
    const canUseSingleN = next && !N_BLOCKERS.includes(next.spelling[0]);
    return { spelling: canUseSingleN ? "n" : "nn", kanaLength: 1 };
  }
  const pair = kana.slice(pos, pos + 2);
  if (PREFERRED_ROMAJI[pair]) return { spelling: PREFERRED_ROMAJI[pair], kanaLength: 2 };
  if (PREFERRED_ROMAJI[char]) return { spelling: PREFERRED_ROMAJI[char], kanaLength: 1 };
  throw new Error(`ローマ字に変換できない文字です: ${char} (${kana})`);
}

function preferredInputFor(kana) {
  let pos = 0;
  let result = "";
  while (pos < kana.length) {
    const unit = preferredUnitAt(kana, pos);
    result += unit.spelling;
    pos += unit.kanaLength;
  }
  return result;
}

function lessonRoleFor(index) {
  if (index < 4) return "intro";
  if (index < 18) return "practice";
  if (index < 26) return "mixed";
  return "treasure";
}

function coralStage(stageId, mainTag, exerciseKind, entries) {
  return entries.map(([title, input, extraTags = []], index) => {
    const preferredInput = preferredInputFor(input);
    const learningTags = [mainTag, ...extraTags];
    return {
      id: `${stageId.toLowerCase()}-${String(index + 1).padStart(2, "0")}`,
      stageId,
      title,
      text: input,
      input,
      inputMode: "ja-romaji",
      preferredInput,
      targetKeys: [...new Set(preferredInput)],
      tags: [exerciseKind, "kana", ...learningTags],
      learningTags,
      lessonRole: lessonRoleFor(index),
      exerciseKind,
      estimatedKeystrokes: preferredInput.length,
    };
  });
}

const CO02 = coralStage("CO02", "word-verb", "word", [
  ["足を 交互に 出す", "あるく"],
  ["元気に かける", "はしる"],
  ["水の 中を すすむ", "およぐ"],
  ["空へ はばたく", "とぶ"],
  ["目で たしかめる", "みる"],
  ["耳を すます", "きく"],
  ["本を ひらいて", "よむ"],
  ["心に うかんだ 絵を", "えがく"],
  ["よく かんで", "たべる"],
  ["水分を とる", "のむ"],
  ["ふとんで 休む", "ねる"],
  ["朝に 目を さます", "おきる"],
  ["みんなで 楽しむ", "あそぶ"],
  ["うれしくて にっこり", "わらう"],
  ["かなしくて 涙が でる", "なく"],
  ["声に 音を のせる", "うたう"],
  ["音に あわせる", "おどる"],
  ["手を つかって", "つくる"],
  ["水で きれいに", "あらう"],
  ["荷物を うごかす", "はこぶ"],
  ["落ちた ものを", "ひろう"],
  ["見えない ものを", "さがす"],
  ["一列に そろう", "ならぶ"],
  ["角で むきを かえる", "まがる"],
  ["橋の むこうへ", "わたる"],
  ["高い ところへ", "のぼる"],
  ["上から 下へ", "おりる"],
  ["前へ ゆっくり", "すすむ"],
  ["来た 道を", "もどる"],
  ["動きを とめて", "やすむ"],
]);

const CO03 = coralStage("CO03", "word-descriptive", "word", [
  ["りんごの ような 色", "あかい", ["color-word"]],
  ["雪の ような 色", "しろい", ["color-word"]],
  ["夜の ような 色", "くろい", ["color-word"]],
  ["ひまわりの ような 色", "きいろい", ["color-word"]],
  ["光が たっぷり", "あかるい"],
  ["光が すくない", "くらい"],
  ["ぞうの ように", "おおきい"],
  ["ありの ように", "ちいさい"],
  ["端まで とおい", "ながい"],
  ["端まで ちかい", "みじかい"],
  ["空に ちかい", "たかい"],
  ["地面に ちかい", "ひくい"],
  ["夏の 日ざし", "あつい"],
  ["冬の 空気", "さむい"],
  ["春の 日ざし", "あたたかい"],
  ["秋の 風", "すずしい"],
  ["すぐに すすむ", "はやい"],
  ["時間を かけて", "おそい"],
  ["持つと ずっしり", "おもい"],
  ["持つと らくらく", "かるい"],
  ["石の ように", "かたい"],
  ["わたの ように", "やわらかい"],
  ["力が たくさん", "つよい"],
  ["力が すこし", "よわい"],
  ["のびのび つかえる", "ひろい"],
  ["中が きゅうくつ", "せまい"],
  ["ぴかぴかに かがやく", "きれい"],
  ["音が ほとんど ない", "しずか"],
  ["心が はずむ", "うれしい"],
  ["涙が でそう", "かなしい"],
]);

const CO04 = coralStage("CO04", "mixed-kana-word", "word", [
  ["みんなで おでかけ", "えんそく", ["hatsuon"]],
  ["せなかに せおう", "りゅっく", ["yoon", "sokuon"]],
  ["空へ とんでいく", "しゃぼんだま", ["yoon", "hatsuon"]],
  ["赤い 小さな さかな", "きんぎょ", ["hatsuon", "yoon"]],
  ["ひと休み できる 店", "きっさてん", ["sokuon", "hatsuon"]],
  ["ごはんに つかう", "しょっき", ["yoon", "sokuon"]],
  ["線路を はしる", "でんしゃ", ["hatsuon", "yoon"]],
  ["ペダルを こいで すすむ", "じてんしゃ", ["hatsuon", "yoon"]],
  ["学校の おひるごはん", "きゅうしょく", ["yoon"]],
  ["甘い おかし", "ちょこれーと", ["yoon", "choon"]],
  ["火事の ときに はたらく", "しょうぼうしゃ", ["yoon"]],
  ["道を わたる 合図", "しんごう", ["hatsuon"]],
  ["みんなが あそぶ 場所", "こうえん", ["hatsuon"]],
  ["いろいろな 生きものが いる", "どうぶつえん", ["variant-tsu", "hatsuon"]],
  ["本が たくさん ある", "としょかん", ["yoon", "hatsuon"]],
  ["せなかに せおう かばん", "らんどせる", ["hatsuon"]],
  ["手や 顔を ふく", "はんかち", ["hatsuon", "variant-chi"]],
  ["箱に 入った ごはん", "べんとう", ["hatsuon"]],
  ["パンで はさんだ 食べもの", "さんどいっち", ["hatsuon", "sokuon", "variant-chi"]],
  ["生まれた 日", "たんじょうび", ["hatsuon", "yoon"]],
  ["もらうと うれしい", "ぷれぜんと", ["hatsuon"]],
  ["冬に かざる 木", "くりすますつりー", ["choon"]],
  ["新しい 年の はじまり", "しょうがつ", ["yoon"]],
  ["服を きれいに する", "せんたくき", ["hatsuon"]],
  ["料理を する へや", "きっちん", ["sokuon", "hatsuon", "variant-chi"]],
  ["風を おくる", "せんぷうき", ["hatsuon"]],
  ["食べものを あたためる", "でんしれんじ", ["hatsuon", "variant-shi", "variant-ji"]],
  ["金魚が くらす", "きんぎょばち", ["hatsuon", "yoon", "variant-chi"]],
  ["春に さく 花", "ちゅーりっぷ", ["yoon", "choon", "sokuon"]],
  ["春の 黄色い 花", "たんぽぽ", ["hatsuon"]],
]);

const CO05 = coralStage("CO05", "phrase-particle", "phrase", [
  ["海で すいすい およぐ", "うみでおよぐ"],
  ["上を 見あげる", "そらをみあげる"],
  ["本を ひらく", "ほんをひらく"],
  ["文字を のこす", "えんぴつでかく"],
  ["みんなで 楽しむ", "こうえんであそぶ"],
  ["足もとを たしかめる", "みちをあるく"],
  ["高い ところへ すすむ", "やまにのぼる"],
  ["川の むこうへ わたる", "かわをわたる"],
  ["おでかけを おえる", "いえにかえる"],
  ["朝の 元気を ためる", "あさごはんをたべる"],
  ["のどを うるおす", "みずをのむ"],
  ["夜の みじたく", "よるにはをみがく"],
  ["あたたかく 休む", "ふとんでねむる"],
  ["空気を 入れる", "まどをあける"],
  ["出入り口を とじる", "どあをしめる"],
  ["水で きれいに する", "てをあらう"],
  ["タオルを つかう", "かおをふく"],
  ["出かける したく", "ふくをきがえる"],
  ["足もとを ととのえる", "くつをはく"],
  ["雨の 中を すすむ", "かさをさす"],
  ["いっしょに お話する", "ともだちとはなす"],
  ["わからない ことを たずねる", "せんせいにきく"],
  ["音を たのしむ", "おんがくをきく"],
  ["声を ひびかせる", "うたをうたう"],
  ["にっこり 楽しむ", "えがおでわらう"],
  ["外で 元気に うごく", "にわではしる"],
  ["順番を そろえる", "れつにならぶ"],
  ["駅から おでかけ", "でんしゃにのる"],
  ["ペダルを まわす", "じてんしゃをこぐ"],
  ["みんなで 一列に", "みんなとならぶ"],
]);

const CO06 = coralStage("CO06", "coral-challenge", "phrase", [
  ["朝の 海が きらり", "あさひがうみをてらす"],
  ["広い 海を すすむ", "さかながうみをおよぐ"],
  ["空の 白い なみ", "しろいくもがながれる"],
  ["波を こえて すすむ", "おおきなふねがすすむ"],
  ["夜空の 宝さがし", "きれいなほしをみつける"],
  ["青空へ はばたく", "あおいとりがそらをとぶ"],
  ["お日さまで ひと休み", "こねこがひなたでねむる"],
  ["森の 小さな はこびや", "りすがきのみをはこぶ"],
  ["風と 葉っぱの ダンス", "かぜがはっぱをゆらす"],
  ["雨の あとの にじ", "あめあがりのにじをみる"],
  ["みんなで おでかけ", "みんなでこうえんへいく"],
  ["力を あわせて のぼる", "ともだちとやまにのぼる"],
  ["川の 宝を みつける", "かわべでいしをひろう"],
  ["浜辺で 宝さがし", "すなはまでかいをさがす"],
  ["ひと口ずつ ていねいに", "ごはんをよくかむ"],
  ["読みやすい 字を めざす", "ていねいにもじをかく"],
  ["大事な ことを ききとる", "せんせいのはなしをきく"],
  ["読みたい 一冊を さがす", "としょかんでほんをえらぶ"],
  ["おでかけの したく", "えんそくのじゅんびをする"],
  ["出発前に もう一度", "わすれものをたしかめる"],
  ["朝の 元気な ひとこと", "げんきなこえであいさつ"],
  ["音に あわせて 楽しむ", "おんがくにあわせておどる"],
  ["うれしさを ことばに する", "うれしいきもちをつたえる"],
  ["力を あわせる", "こまったときはたすけあう"],
  ["元の ばしょへ もどす", "つかったものをかたづける"],
  ["朝を 元気に はじめる", "はやねはやおきをする"],
  ["道の きまりを 大切に", "こうつうるーるをまもる"],
  ["生きものを 大切に", "どうぶつにやさしくする"],
  ["水槽を おそうじ", "みずそうをきれいにする"],
  ["おわりまで 一歩ずつ", "さいごまでゆっくりすすむ"],
]);

export const CORAL_PROBLEM_CONTENT = [
  ...CO02,
  ...CO03,
  ...CO04,
  ...CO05,
  ...CO06,
];
