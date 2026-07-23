const LETTER_KEYS = "abcdefghijklmnopqrstuvwxyz".split("");
const WORD_KEYS = [...LETTER_KEYS, "-"];
const SIX_PROBLEM_LESSON_PLAN = ["intro", "intro", "practice", "practice", "mixed", "treasure"];

const tidepoolStage = (stage, order) => ({
  ...stage,
  order,
  problemCount: 3,
});

const shallowStage = (stage, order) => ({
  ...stage,
  regionId: "shallows",
  order,
  introducedKeys: stage.introducedKeys ?? [],
  availableKeys: WORD_KEYS,
  problemCount: 6,
  lessonPlan: SIX_PROBLEM_LESSON_PLAN,
  minAccuracy: 0.87,
  medalCriteria: {
    carefulMinAccuracy: 0.96,
    speedMaxMsPerKey: stage.speedMaxMsPerKey ?? 1350,
  },
});

const coralStage = (stage, order) => ({
  ...stage,
  regionId: "coral-forest",
  order,
  introducedKeys: [],
  availableKeys: WORD_KEYS,
  problemCount: 6,
  lessonPlan: SIX_PROBLEM_LESSON_PLAN,
  minAccuracy: stage.minAccuracy ?? 0.88,
  medalCriteria: {
    carefulMinAccuracy: stage.carefulMinAccuracy ?? 0.96,
    speedMaxMsPerKey: stage.speedMaxMsPerKey ?? 1450,
  },
});

export const STAGE_CONTENT = [
  tidepoolStage({ id: "S00", regionId: "tidepool", name: "潮だまりのぽっち", description: "F と J のぽっちに、指をかえそう。", introducedKeys: ["f", "j"], availableKeys: ["f", "j"], minCompletedPlays: 1, minAccuracy: 0.8, medalCriteria: { carefulMinAccuracy: 0.95, speedMaxMsPerKey: 1300 } }, 0),
  tidepoolStage({ id: "S01", regionId: "tidepool", name: "潮だまりの左手", description: "左手のおうちを、ゆっくりたどろう。", introducedKeys: ["a", "s", "d"], availableKeys: ["a", "s", "d", "f"], minCompletedPlays: 2, minAccuracy: 0.8, medalCriteria: { carefulMinAccuracy: 0.95, speedMaxMsPerKey: 1200 } }, 1),
  tidepoolStage({ id: "S02", regionId: "tidepool", name: "潮だまりの右手", description: "右手も、おうちに帰ってこられるかな。", introducedKeys: ["k", "l"], availableKeys: ["j", "k", "l"], minCompletedPlays: 2, minAccuracy: 0.8, medalCriteria: { carefulMinAccuracy: 0.95, speedMaxMsPerKey: 1200 } }, 2),
  tidepoolStage({ id: "S03", regionId: "tidepool", name: "潮だまりのリズム", description: "左右の手で、小さな波をつなごう。", introducedKeys: ["a", "s", "d", "f", "j", "k", "l"], availableKeys: ["a", "s", "d", "f", "j", "k", "l"], minCompletedPlays: 3, minAccuracy: 0.82, medalCriteria: { carefulMinAccuracy: 0.96, speedMaxMsPerKey: 1100 } }, 3),
  tidepoolStage({ id: "S04", regionId: "tidepool", name: "潮だまりの上の波", description: "左手をのばして、上の波をたどろう。", introducedKeys: ["q", "w", "e", "r", "t"], availableKeys: ["a", "s", "d", "f", "q", "w", "e", "r", "t"], minCompletedPlays: 2, minAccuracy: 0.82, medalCriteria: { carefulMinAccuracy: 0.96, speedMaxMsPerKey: 1100 } }, 4),
  tidepoolStage({ id: "S05", regionId: "tidepool", name: "潮だまりの右の波", description: "右手をのばして、上の波をたどろう。", introducedKeys: ["y", "u", "i", "o", "p"], availableKeys: ["j", "k", "l", "y", "u", "i", "o", "p"], minCompletedPlays: 2, minAccuracy: 0.82, medalCriteria: { carefulMinAccuracy: 0.96, speedMaxMsPerKey: 1100 } }, 5),
  tidepoolStage({ id: "S06", regionId: "tidepool", name: "潮だまりの大きな波", description: "上の段を、両手でつないでみよう。", introducedKeys: [], availableKeys: ["a", "s", "d", "f", "j", "k", "l", "q", "w", "e", "r", "t", "y", "u", "i", "o", "p"], minCompletedPlays: 3, minAccuracy: 0.85, medalCriteria: { carefulMinAccuracy: 0.97, speedMaxMsPerKey: 1000 } }, 6),
  tidepoolStage({ id: "S07", regionId: "tidepool", name: "潮だまりの左の砂", description: "左手で、下の段へもぐってみよう。", introducedKeys: ["z", "x", "c", "v", "b"], availableKeys: ["a", "s", "d", "f", "q", "w", "e", "r", "t", "z", "x", "c", "v", "b"], minCompletedPlays: 2, minAccuracy: 0.85, medalCriteria: { carefulMinAccuracy: 0.97, speedMaxMsPerKey: 1000 } }, 7),
  tidepoolStage({ id: "S08", regionId: "tidepool", name: "潮だまりの右の砂", description: "右手で、下の段へもぐってみよう。", introducedKeys: ["n", "m", ",", ".", "/"], availableKeys: ["j", "k", "l", "y", "u", "i", "o", "p", "n", "m", ",", ".", "/"], minCompletedPlays: 2, minAccuracy: 0.85, medalCriteria: { carefulMinAccuracy: 0.97, speedMaxMsPerKey: 1000 } }, 8),

  shallowStage({ id: "SH01", name: "浅瀬の母音", description: "A・I・U・E・Oで「あいうえお」をつくろう。", focusTags: ["vowel", "a-row"], minCompletedPlays: 2 }, 9),
  shallowStage({ id: "SH02", name: "浅瀬のか行", description: "Kと母音をつないで、か行をつくろう。", focusTags: ["consonant-vowel", "k-row"], minCompletedPlays: 2 }, 10),
  shallowStage({ id: "SH03", name: "浅瀬のさ・た行", description: "さ行・た行と「し・ち・つ」を練習しよう。", focusTags: ["s-row", "t-row", "variant-shi", "variant-chi", "variant-tsu"], minCompletedPlays: 2 }, 11),
  shallowStage({ id: "SH04", name: "浅瀬のな・は・ま行", description: "な行・は行・ま行を、ゆっくりつなごう。", focusTags: ["n-row", "h-row", "m-row", "variant-fu"], minCompletedPlays: 2 }, 12),
  shallowStage({ id: "SH05", name: "浅瀬のや・ら・わ行", description: "や行・ら行・わ行の波をたどろう。", focusTags: ["y-row", "r-row", "w-row", "variant-wo"], minCompletedPlays: 2 }, 13),
  shallowStage({ id: "SH06", name: "浅瀬のにごる音", description: "が・ざ・だ・ば・ぱ行を練習しよう。", focusTags: ["voiced", "semi-voiced", "g-row", "z-row", "d-row", "b-row", "p-row", "variant-ji", "di-du"], minCompletedPlays: 3 }, 14),
  shallowStage({ id: "SH07", name: "浅瀬の「ん」", description: "ことばの中の「ん」をたどろう。", focusTags: ["hatsuon", "n-final", "n-before-consonant", "n-before-vowel", "n-before-y"], minCompletedPlays: 3 }, 15),
  shallowStage({ id: "SH08", name: "浅瀬の小さい「っ」", description: "小さい「っ」で、音をはずませよう。", focusTags: ["sokuon"], minCompletedPlays: 3 }, 16),
  shallowStage({ id: "SH09", name: "浅瀬ののばす音", description: "「ー」で、ことばの音をのばそう。", focusTags: ["choon"], introducedKeys: ["-"], minCompletedPlays: 3 }, 17),
  shallowStage({ id: "SH10", name: "浅瀬の小さい文字", description: "小さい「ゃ・ゅ・ょ」が入ることばを打とう。", focusTags: ["yoon", "k-yoon", "s-yoon", "t-yoon", "n-yoon", "h-yoon", "m-yoon", "r-yoon"], minCompletedPlays: 3, speedMaxMsPerKey: 1400 }, 18),
  shallowStage({ id: "SH11", name: "浅瀬のにごる小さい文字", description: "ぎゃ・じゃ・びょなどの音を練習しよう。", focusTags: ["yoon", "voiced", "semi-voiced", "g-yoon", "j-yoon", "d-yoon", "b-yoon", "p-yoon"], minCompletedPlays: 4, speedMaxMsPerKey: 1400 }, 19),

  coralStage({ id: "CO01", name: "珊瑚の森のことば", description: "身近なものや自然のことばを、ていねいに打とう。", focusTags: ["basic-word"], minCompletedPlays: 4, speedMaxMsPerKey: 1400 }, 20),
  coralStage({ id: "CO02", name: "珊瑚の森のうごき", description: "歩く・見るなど、動きを表すことばを打とう。", focusTags: ["word-verb"], minCompletedPlays: 3 }, 21),
  coralStage({ id: "CO03", name: "珊瑚の森のようす", description: "明るい・静かなど、様子を表すことばを打とう。", focusTags: ["word-descriptive"], minCompletedPlays: 3 }, 22),
  coralStage({ id: "CO04", name: "珊瑚の森のまざる音", description: "「ん・っ・ー・ゃゅょ」が入ることばを復習しよう。", focusTags: ["mixed-kana-word"], minCompletedPlays: 4, minAccuracy: 0.89, carefulMinAccuracy: 0.97, speedMaxMsPerKey: 1500 }, 23),
  coralStage({ id: "CO05", name: "珊瑚の森のつながり", description: "「を・に・で」などで、短いことばをつなごう。", focusTags: ["phrase-particle"], minCompletedPlays: 4, minAccuracy: 0.89, carefulMinAccuracy: 0.97, speedMaxMsPerKey: 1500 }, 24),
  coralStage({ id: "CO06", name: "珊瑚の森チャレンジ", description: "森で集めたことばを、6つ続けてたどろう。", focusTags: ["coral-challenge"], minCompletedPlays: 5, minAccuracy: 0.9, carefulMinAccuracy: 0.97, speedMaxMsPerKey: 1550 }, 25),
];
