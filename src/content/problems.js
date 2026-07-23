function direct(stageId, entries) {
  return entries.map(([title, input], index) => ({
    id: `${stageId.toLowerCase()}-${String(index + 1).padStart(2, "0")}`,
    stageId,
    title,
    text: input.toUpperCase(),
    input,
    inputMode: "direct",
    targetKeys: [...new Set([...input.replace(/\s/g, "")])],
    tags: ["practice"],
    estimatedKeystrokes: input.replace(/\s/g, "").length,
  }));
}

function kana(entries) {
  return entries.map(([title, text, input, romaji], index) => ({
    id: `s09-${String(index + 1).padStart(2, "0")}`,
    stageId: "S09",
    title,
    text,
    input,
    inputMode: "ja-romaji",
    targetKeys: [...romaji],
    tags: ["word", "kana"],
    estimatedKeystrokes: romaji.length,
  }));
}

export const PROBLEM_CONTENT = [
  ...direct("S00", [["ぽっちを みつけよう", "fj"], ["ゆっくり いったりきたり", "fjfj"], ["みぎから かえろう", "jffj"], ["ふたつの ひかり", "ffjj"], ["ちいさな みち", "fjfjfj"], ["ひかりを つなぐ", "fjjf"], ["おうちへ かえる", "jfjf"], ["きらりの リズム", "ffjfj"]]),
  ...direct("S01", [["ひだりの みち", "asdf"], ["ひとつずつ もどろう", "fdsa"], ["おうちを あるこう", "asfd"], ["みじかい リズム", "sadf"], ["やわらかい かぜ", "dfas"], ["石を たどろう", "asds"], ["花の みち", "fdaf"], ["光を つなぐ", "sdfa"]]),
  ...direct("S02", [["みぎの みち", "jkl"], ["ひとつずつ もどろう", "lkj"], ["おうちを あるこう", "jlk"], ["みじかい リズム", "kjl"], ["ひかりを たどろう", "ljk"], ["石を たどろう", "jklj"], ["星の みち", "kllk"], ["光を つなぐ", "ljkl"]]),
  ...direct("S03", [["ふたつの みち", "asdf jkl"], ["ひだりから みぎへ", "asdjkl"], ["かぜの ステップ", "fjdskl"], ["おうちの ダンス", "safjdl"], ["きらりの みち", "dfjkasl"], ["たからばこ", "asdf jkl asdf"], ["橋を わたろう", "fjas dk"], ["まんなかの 光", "sdjk af"]]),
  ...direct("S04", [["ひだりの 丘", "qwer"], ["のぼって もどろう", "trewq"], ["かぜの みち", "qwert"], ["おうちへ かえる", "fdsare"], ["ちいさな ステップ", "wqer"], ["雲を たどろう", "qwe rt"], ["丘の ひかり", "trew"], ["葉っぱの みち", "aqwsed"]]),
  ...direct("S05", [["みぎの 丘", "yuiop"], ["のぼって もどろう", "poiuy"], ["ひかりの みち", "yuipo"], ["おうちへ かえる", "jklui"], ["ちいさな ステップ", "uioy"], ["雲を たどろう", "yui op"], ["丘の ひかり", "piuyo"], ["星の みち", "juykli"]]),
  ...direct("S06", [["丘を つなごう", "qwer yuiop"], ["風の リズム", "tyu rew"], ["空の みち", "qwe yui"], ["両手の ダンス", "asdf jkl qwer"], ["ひかりの 橋", "tryu ioe"], ["雲を こえて", "qwr yuo"], ["風を つかまえよう", "rew poi"], ["空の ステップ", "tyu qwe"]]),
  ...direct("S07", [["ひだりの 小道", "zxcvb"], ["おりて もどろう", "bvcxz"], ["草の リズム", "zxcv"], ["まっすぐ あるこう", "asdf zxcv"], ["ちいさな 石", "cvbz"], ["葉っぱの 道", "zxc vb"], ["森の リズム", "bvcz"], ["土の みち", "asdzxc"]]),
  ...direct("S08", [["みぎの 小道", "nm,./"], ["おりて もどろう", "/.,mn"], ["草の リズム", "nm,."], ["まっすぐ あるこう", "jkl nm,."], ["ちいさな 石", "m,n/."], ["葉っぱの 道", "nm, /."], ["森の リズム", ".,/mn"], ["土の みち", "jknm,."]]),
  ...kana([["朝の ひかり", "あさ", "あさ", "asa"], ["小さな いす", "いす", "いす", "isu"], ["かさを ひらく", "かさ", "かさ", "kasa"], ["ねこが いる", "ねこ", "ねこ", "neko"], ["花を みつけた", "はな", "はな", "hana"], ["さかなの みち", "さかな", "さかな", "sakana"], ["ふくを えらぶ", "ふく", "ふく", "fuku"], ["たまごを みつけた", "たまご", "たまご", "tamago"], ["空を 見る", "そら", "そら", "sora"], ["山を のぼる", "やま", "やま", "yama"], ["川の ほとり", "かわ", "かわ", "kawa"], ["雲が うかぶ", "くも", "くも", "kumo"], ["星を 見つけた", "ほし", "ほし", "hoshi"], ["海の ひかり", "うみ", "うみ", "umi"], ["鳥が とぶ", "とり", "とり", "tori"], ["犬と あそぶ", "いぬ", "いぬ", "inu"], ["耳を すます", "みみ", "みみ", "mimi"], ["めがねを かける", "めがね", "めがね", "megane"], ["りすが はしる", "りす", "りす", "risu"], ["きつねを 見た", "きつね", "きつね", "kitsune"], ["しまうまの もよう", "しまうま", "しまうま", "shimauma"], ["青い そら", "あおい", "あおい", "aoi"], ["おかしの 時間", "おかし", "おかし", "okashi"], ["えんぴつを もつ", "えんぴつ", "えんぴつ", "enpitsu"], ["ふねが すすむ", "ふね", "ふね", "fune"], ["まどを あける", "まど", "まど", "mado"], ["たこを あげる", "たこ", "たこ", "tako"], ["すいかを 食べる", "すいか", "すいか", "suika"], ["にわの 花", "にわ", "にわ", "niwa"], ["らっぱが なる", "らっぱ", "らっぱ", "rappa"], ["きってを はる", "きって", "きって", "kitte"], ["しおの かおり", "しお", "しお", "shio"]]),
];
