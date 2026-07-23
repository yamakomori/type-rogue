import { useEffect, useReducer } from "react";
import { STAGES, getStage } from "../../domain/curriculum.js";
import { ITEMS, getItem } from "../../domain/economy.js";
import { getFingerGuide } from "../../domain/fingers.js";
import { fishCollectionStats, fishCountsBySpecies, fishDiscovery, fishSpeciesForRegion, getFishSpecies } from "../../domain/fish.js";
import { reviewKeysForStage } from "../../domain/learning.js";
import { getRegion, getUnlockedRegions } from "../../domain/regions.js";
import { loadSave, persistSave } from "../../domain/save.js";
import { createGameState, gameReducer } from "../../game/state/gameReducer.js";
import "../../styles.css";

const KEY_ROWS = [
  ["q", "w", "e", "r", "t", "y", "u", "i", "o", "p"],
  ["a", "s", "d", "f", "g", "h", "j", "k", "l"],
  ["z", "x", "c", "v", "b", "n", "m", ",", ".", "/"],
];

export default function GameShell() {
  const [state, dispatch] = useReducer(gameReducer, undefined, () => createGameState(loadSave()));

  useEffect(() => { persistSave(state.save); }, [state.save]);

  useEffect(() => {
    if (state.screen !== "typing" || !state.session?.attempt.completed) return undefined;
    const id = window.setTimeout(() => dispatch({ type: "AUTO_ADVANCE" }), 650);
    return () => window.clearTimeout(id);
  }, [state.screen, state.session?.attempt.completed, state.session?.index]);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.ctrlKey || event.metaKey || event.altKey || event.isComposing) return;
      if (state.screen === "result") {
        if (event.key.toLowerCase() === "m") dispatch({ type: "SHOW_MAP" });
        if (event.key.toLowerCase() === "r") dispatch({ type: "START_STAGE", stageId: state.result?.stage.id ?? state.save.currentStageId });
        if (event.key.toLowerCase() === "n" && state.result?.nextStageId) dispatch({ type: "START_STAGE", stageId: state.result.nextStageId });
        return;
      }
      if (state.screen !== "typing" || event.key.length !== 1) return;
      event.preventDefault();
      dispatch({ type: "TYPE_KEY", key: event.key.toLowerCase(), now: Date.now() });
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [state.screen, state.session, state.save.currentStageId]);

  const navigation = (type) => dispatch({ type });
  const content = state.screen === "intro" ? <IntroScreen state={state} dispatch={dispatch} />
    : state.screen === "typing" ? <TypingScreen state={state} dispatch={dispatch} />
    : state.screen === "aquarium" ? <AquariumScreen state={state} dispatch={dispatch} />
      : state.screen === "wardrobe" ? <WardrobeScreen state={state} dispatch={dispatch} />
      : state.screen === "settings" ? <SettingsScreen state={state} dispatch={dispatch} />
        : <MapScreen state={state} dispatch={dispatch} isDev={import.meta.env.DEV} />;

  return <>
    {state.screen !== "intro" && <Header save={state.save} onMap={() => navigation("SHOW_MAP")} onAquarium={() => navigation("SHOW_AQUARIUM")} onWardrobe={() => navigation("SHOW_WARDROBE")} onSettings={() => navigation("SHOW_SETTINGS")} />}
    {content}
    {state.screen === "result" && <RewardOverlay state={state} dispatch={dispatch} />}
    {state.releaseCandidateId && <ReleaseConfirmDialog state={state} dispatch={dispatch} />}
  </>;
}

function Header({ save, onMap, onAquarium, onWardrobe, onSettings }) {
  return <header className="topbar"><button className="brand" onClick={onMap} aria-label="海図へ">ことばの小さな海</button><div className="topbar-actions"><span className="coin" aria-label={`コイン ${save.coins}`}>◌ {save.coins}</span><button className="icon-button" onClick={onAquarium} aria-label="水槽を見る">♒</button><button className="icon-button" onClick={onWardrobe} aria-label="着せ替え">♧</button><button className="icon-button" onClick={onSettings} aria-label="設定">⚙</button></div></header>;
}

function IntroScreen({ state, dispatch }) {
  return <main className="intro-screen"><div className="intro-card"><Avatar save={state.save} /><p className="eyebrow">ことばの小さな海へようこそ</p><h1>F と J のぽっちを<br />さわってみよう</h1><p>3つの短い問題を打つと、<br />最初の魚に会えるよ。</p><button className="primary-button intro-start" onClick={() => dispatch({ type: "BEGIN_INTRO" })}>はじめる</button><button className="text-button intro-skip" onClick={() => dispatch({ type: "SKIP_INTRO" })}>海図をみる</button></div></main>;
}

function Avatar({ save }) {
  const body = getItem(save.equipped.bodyColor);
  const head = getItem(save.equipped.head);
  const outfit = getItem(save.equipped.outfit);
  const headMark = head?.kind === "leaf" ? "◆" : head?.kind === "star" ? "★" : "";
  return <div className="avatar" aria-label="あなたの相棒"><div className="avatar-headmark">{headMark}</div><div className="avatar-head" style={{ background: body?.color ?? "#88a97a" }} /><div className="avatar-body" style={{ background: outfit?.color ?? "#ece3cc" }} /><span className="avatar-eye left" /><span className="avatar-eye right" /></div>;
}

function MapScreen({ state, dispatch, isDev }) {
  const collection = fishCollectionStats(state.save.caughtFish);
  return <section className="map-screen"><div className="map-hero sea-hero"><div><p className="eyebrow">きょうの海</p><h1>今日は、どの海へ行く？</h1><p>3つのことばを打つと、魚が1匹つれるよ。</p><button className="primary-button hero-action" onClick={() => dispatch({ type: "SHOW_AQUARIUM" })}>水槽をみる <small>{collection.total} 匹</small></button></div><AquariumPreview fish={state.save.caughtFish} emptyMessage="海へ出ると、魚に出会えるよ。" /></div><p className="map-lead">ぼうけんする海をえらぼう</p><div className="stage-list">{STAGES.map((stage, index) => {
    const unlocked = state.save.unlockedStageIds.includes(stage.id);
    const current = state.save.currentStageId === stage.id;
    const plays = state.save.stagePlayCounts[stage.id] ?? 0;
    const discovery = fishDiscovery(state.save.discoveredFishSpeciesIds, [stage.id]);
    const reviewKeys = current ? reviewKeysForStage(state.save.skills, stage.availableKeys) : [];
    return <article key={stage.id} className={`stage-card ${unlocked ? "" : "locked"} ${current ? "current" : ""}`}><span className="stage-number">{String(index + 1).padStart(2, "0")}</span><div><h2>{unlocked ? stage.name : "まだ いけない 海"}</h2><p>{unlocked ? stage.description : "ひとつ前の海で 魚をつると、ひらくよ。"}</p>{unlocked && <div className="stage-progress"><small>{plays} 回つりをした</small><small className="fish-discovery">出会った魚 {discovery.discovered}/{discovery.total}</small>{reviewKeys.length > 0 && <small className="review-current">いま練習するキー：{reviewKeys.map((key) => key.toUpperCase()).join("・")}</small>}<StageMedals medals={state.save.stageMedals[stage.id]} /></div>}</div><button className="secondary-button" disabled={!unlocked} onClick={() => dispatch({ type: "START_STAGE", stageId: stage.id })}>この海へ</button></article>;
  })}</div>{isDev && <details className="dev-stage-selector"><summary>開発用: 試すステージを選ぶ</summary><div>{STAGES.map((stage) => <button key={stage.id} className="secondary-button" onClick={() => dispatch({ type: "DEV_START_STAGE", stageId: stage.id })}>{stage.id}</button>)}</div></details>}</section>;
}

function FishVisual({ caughtFish, className = "", index = 0, muted = false, isNew = false }) {
  const species = getFishSpecies(caughtFish?.speciesId);
  const position = { left: `${9 + ((index * 19) % 76)}%`, top: `${20 + ((index * 23) % 54)}%` };
  return <span className={`fish-visual ${species.shape} ${caughtFish?.size ?? "medium"} ${caughtFish?.variant ?? "common"} ${className} ${muted ? "muted" : ""}`} style={{ "--fish": species.color, "--accent": species.accent, ...position }} aria-label={muted ? "近づいている魚影" : species.name}><span className="fish-tail" /><span className="fish-body" /><span className="fish-eye" />{caughtFish?.variant === "gold" && <span className="fish-crown">⌁</span>}{isNew && <span className="new-fish-badge">NEW</span>}</span>;
}

function AquariumPreview({ fish = [], emptyMessage }) {
  const visibleFish = fish.slice(-8);
  return <div className="aquarium-preview" aria-label={`水槽。つかまえた魚 ${fish.length} 匹`}><div className="water-shine" />{visibleFish.length > 0 ? visibleFish.map((caughtFish, index) => <FishVisual key={caughtFish.id} caughtFish={caughtFish} index={index} />) : <p>{emptyMessage}</p>}<span className="aquarium-sand" /></div>;
}

function StageMedals({ medals = {}, onlyEarned = false }) {
  const definitions = [
    { key: "careful", label: "て", title: "ていねいさメダル" },
    { key: "speed", label: "速", title: "スピードメダル" },
    { key: "gold", label: "金", title: "ゴールドメダル" },
  ];
  const visible = onlyEarned ? definitions.filter((medal) => medals[medal.key]) : definitions;
  return <div className="stage-medals" aria-label={`ていねいさ: ${medals.careful ? "獲得" : "未獲得"}、スピード: ${medals.speed ? "獲得" : "未獲得"}、ゴールド: ${medals.gold ? "獲得" : "未獲得"}`}>{visible.map((medal) => <span key={medal.key} className={`medal ${medal.key} ${medals[medal.key] ? "earned" : ""}`} title={medal.title}>{medal.label}</span>)}</div>;
}

function TypingScreen({ state, dispatch }) {
  const { stage, index, problems, attempt, feedback, reviewKeys } = state.session;
  const display = attempt.matcher.display();
  const finger = getFingerGuide(display.next);
  const companionText = attempt.completed ? "みつけた！ 魚影が近づいているよ。" : feedback || (finger.label ? `${finger.label}で ${display.next === " " ? "Space" : display.next.toUpperCase()} を おそう。` : "つぎのキーを、ゆっくりさがそう。");
  const fishProgress = (index + (attempt.completed ? 1 : 0)) / problems.length;
  return <section className={`typing-screen ${state.save.settings.reducedMotion ? "reduce-motion" : ""}`}><div className="typing-top"><button className="text-button" onClick={() => dispatch({ type: "SHOW_MAP" })}>← 海図へ</button><span>つり {index + 1} / {problems.length}</span></div><div className="typing-stage sea-typing-stage"><FishingProgress progress={fishProgress} /><p className="eyebrow">{stage.name}</p>{reviewKeys.length > 0 && <p className="practice-key">いま練習するキー：{reviewKeys.map((key) => key.toUpperCase()).join("・")}</p>}<p className="problem-title">{attempt.problem.title}</p><p className="problem-text" aria-label="入力する文字">{attempt.problem.text}</p><p className="input-guide" aria-label="ローマ字入力"><span className="typed">{display.typed || "\u00a0"}</span><span className="next">{display.next}</span><span className="rest">{display.rest}</span></p>{attempt.completed && <p className="clear-message">糸をたぐっている…</p>}</div>{state.save.settings.keyboardGuide && <KeyboardGuide expected={display.next} finger={finger} save={state.save} companionText={companionText} />}</section>;
}

function FishingProgress({ progress }) {
  const positions = { "--progress": progress, "--line-height": `${48 + progress * 42}%`, "--fish-left": `${74 - progress * 42}%`, "--fish-top": `${56 - progress * 24}%`, "--fish-opacity": .25 + progress * .75 };
  return <div className="fishing-progress" style={positions} aria-label={`魚が ${Math.round(progress * 100)} パーセント近づいています`}><span className="fishing-line" /><FishVisual caughtFish={{ speciesId: "tide-goby" }} muted={progress < 1} /></div>;
}

function KeyboardGuide({ expected, finger, save, companionText }) {
  return <div className="keyboard-area"><aside className="guide-companion" aria-live="polite"><Avatar save={save} /><p className="speech-bubble">{companionText}</p></aside><div className="keyboard-guide" aria-label="キーボードガイド">{KEY_ROWS.map((row) => <div className="key-row" key={row.join("")}>{row.map((key) => <span key={key} className={`keycap ${expected === key ? "expected" : ""}`}>{key.toUpperCase()}</span>)}</div>)}<div className="key-row"><span className={`keycap space ${expected === " " ? "expected" : ""}`}>SPACE</span></div><div className="finger-guide" aria-label="使う指のガイド"><Hand side="left" active={finger} /><Hand side="right" active={finger} /></div></div></div>;
}

function Hand({ side, active }) {
  const name = side === "left" ? "左手" : "右手";
  return <div className="hand-group"><span className="hand-label">{name}</span><div className={`hand ${side}`} aria-label={`${name}の指`}><span className="palm" />{["pinky", "ring", "middle", "index", "thumb"].map((finger) => <span key={finger} className={`finger ${finger} ${active.finger === finger && (active.side === side || active.side === "both") ? "active" : ""}`} />)}</div></div>;
}

function WardrobeScreen({ state, dispatch }) {
  return <section className="wardrobe-screen"><div className="screen-heading"><div><p className="eyebrow">相棒のもちもの</p><h1>今日は、なにを身につける？</h1><p>{state.message || "海で見つけたコインで、身じたくできるよ。"}</p></div><Avatar save={state.save} /></div><div className="item-grid">{ITEMS.map((item) => { const owned = state.save.ownedItemIds.includes(item.id); const equipped = state.save.equipped[item.slot] === item.id; const visual = item.kind === "leaf" ? "◆" : item.kind === "star" ? "★" : "●"; return <article key={item.id} className={`item-card ${equipped ? "equipped" : ""}`}><div className="item-preview" style={item.color ? { "--item-color": item.color } : undefined}>{visual}</div><h2>{item.name}</h2><p>{item.slot === "bodyColor" ? "からだの色" : item.slot === "head" ? "あたま" : "ふく"}</p><button className="secondary-button" disabled={equipped} onClick={() => dispatch({ type: "PURCHASE_OR_EQUIP", itemId: item.id })}>{equipped ? "つけている" : owned ? "つける" : `${item.price} コインで みつける`}</button></article>; })}</div><button className="text-button back-button" onClick={() => dispatch({ type: "SHOW_MAP" })}>← 海図へもどる</button></section>;
}

function AquariumScreen({ state, dispatch }) {
  const collection = fishCollectionStats(state.save.caughtFish);
  const unlockedRegions = getUnlockedRegions(state.save.unlockedStageIds);
  const region = getRegion(state.selectedTankId);
  const tankFish = state.save.caughtFish.filter((fish) => (fish.regionId ?? getFishSpecies(fish.speciesId).regionId) === region.id);
  const species = fishSpeciesForRegion(region.id);
  const discovery = fishDiscovery(state.save.discoveredFishSpeciesIds, region.stageIds);
  const counts = fishCountsBySpecies(tankFish);
  return <section className="aquarium-screen"><div className="screen-heading aquarium-heading"><div><p className="eyebrow">あなたの水槽</p><h1>{region.tankName}</h1><p>{collection.total === 0 ? "海へ出ると、最初の魚に出会えるよ。" : `${tankFish.length} 匹が、この水槽を泳いでいるよ。`}</p><button className="primary-button hero-action" onClick={() => dispatch({ type: "SHOW_MAP" })}>海へ出かける</button></div><Avatar save={state.save} /></div>{unlockedRegions.length > 1 && <div className="tank-tabs" role="tablist" aria-label="水槽を選ぶ">{unlockedRegions.map((item) => <button key={item.id} role="tab" aria-selected={item.id === region.id} className={`tank-tab ${item.id === region.id ? "selected" : ""}`} onClick={() => dispatch({ type: "SELECT_TANK", regionId: item.id })}>{item.name}</button>)}</div>}<AquariumPreview fish={tankFish} emptyMessage="まだ魚はいないよ。最初の海へ出かけよう。" /><div className="collection-heading"><div><p className="eyebrow">水槽にいる魚</p><h2>{tankFish.length} 匹</h2></div><button className="secondary-button" onClick={() => dispatch({ type: "SHOW_MAP" })}>海図へ</button></div><div className="tank-fish-list">{tankFish.length === 0 ? <p className="empty-collection">この水槽は、いまは静かだよ。</p> : tankFish.slice().reverse().map((fish) => { const item = getFishSpecies(fish.speciesId); return <article className="tank-fish-card" key={fish.id}><FishVisual caughtFish={fish} /><div><h3>{item.name}</h3><p>{item.habitat}で出会った</p></div><button className="release-button" onClick={() => dispatch({ type: "REQUEST_RELEASE", fishId: fish.id })}>海へ逃がす</button></article>; })}</div><div className="collection-heading fish-book-heading"><div><p className="eyebrow">海のずかん</p><h2>出会った魚 {discovery.discovered} / {discovery.total}</h2></div></div><div className="fish-collection">{species.map((item) => { const count = counts[item.id] ?? 0; const discovered = state.save.discoveredFishSpeciesIds.includes(item.id); return <article className={`fish-card ${discovered ? "" : "undiscovered"}`} key={item.id}><FishVisual caughtFish={{ speciesId: item.id }} muted={!discovered} /><div><h3>{discovered ? item.name : "まだ会っていない魚"}</h3><p>{discovered ? `水槽に ${count} 匹` : "この海で待っているみたい"}</p></div></article>; })}</div></section>;
}

function SettingsScreen({ state, dispatch }) {
  return <section className="settings-screen"><p className="eyebrow">設定</p><h1>遊びやすくする</h1><div className="settings-list"><button className="setting-row" onClick={() => dispatch({ type: "TOGGLE_GUIDE" })}><span>キーボードガイド</span><strong>{state.save.settings.keyboardGuide ? "表示中" : "非表示"}</strong></button><button className="setting-row" onClick={() => dispatch({ type: "TOGGLE_MOTION" })}><span>動きをひかえめにする</span><strong>{state.save.settings.reducedMotion ? "オン" : "オフ"}</strong></button></div><button className="danger-button" onClick={() => window.confirm("冒険のきろくを最初からにしますか？") && dispatch({ type: "RESET" })}>冒険のきろくを最初からにする</button><button className="text-button back-button" onClick={() => dispatch({ type: "SHOW_MAP" })}>← 地図へもどる</button></section>;
}

function RewardOverlay({ state, dispatch }) {
  const nextName = state.result.nextStageId ? getStage(state.result.nextStageId).name : null;
  const nextStageWasJustUnlocked = state.result.unlockedStageId === state.result.nextStageId;
  const earned = state.result.newlyEarnedMedals;
  const fish = getFishSpecies(state.result.caughtFish.speciesId);
  if (state.result.firstCatch) {
    return <section className="reward-overlay" role="dialog" aria-modal="true" aria-label="最初につれた魚"><div className="reward-card first-catch-card"><p className="eyebrow">最初の魚</p><FishVisual caughtFish={state.result.caughtFish} className="reward-fish" isNew /><h1>{fish.name}が<br />つれた！</h1><p>水槽につれてかえろう。</p><button className="primary-button first-aquarium-button" onClick={() => dispatch({ type: "SHOW_AQUARIUM", regionId: state.result.caughtFish.regionId })}>水槽をみる</button>{nextName && <button className="secondary-button first-next-stage-button" onClick={() => dispatch({ type: "START_STAGE", stageId: state.result.nextStageId })}>次の海へ進む <small>{nextName} <kbd>N</kbd></small></button>}</div></section>;
  }
  return <section className="reward-overlay" role="dialog" aria-modal="true" aria-label="つれた魚"><div className="reward-card fish-reward"><div className="result-glow">✦</div><p className="eyebrow">つれた魚</p><FishVisual caughtFish={state.result.caughtFish} className="reward-fish" isNew={state.result.isNewSpecies} /><h1>{fish.name}が<br />つれた！</h1><div className="found-item fish-found-item"><FishVisual caughtFish={state.result.caughtFish} /><strong>水槽につれてかえろう</strong><small>{fish.habitat}</small>{state.result.isNewSpecies && <span className="new-fish-badge card-badge">NEW</span>}</div>{!state.result.fishReleased && <button className="text-button release-result-button" onClick={() => dispatch({ type: "REQUEST_RELEASE", fishId: state.result.caughtFish.id })}>海へ逃がす</button>}{(earned.careful || earned.speed || earned.gold) && <div className="new-medals"><span>あたらしいメダル</span><StageMedals medals={earned} onlyEarned /></div>}<p>{state.result.fishReleased ? "海へ逃がしたよ。図鑑には残るよ。" : state.result.accuracy >= 0.85 ? "ていねいに糸をたぐれたね。" : "最後までつれたね。すてき！"}</p>{nextName && <div className="next-route-group"><div><span>{nextStageWasJustUnlocked ? "あたらしい海が ひらいた！" : "次の海へ進めるよ"}</span><strong>{nextName}</strong></div><button className="primary-button route-button" onClick={() => dispatch({ type: "START_STAGE", stageId: state.result.nextStageId })}>すすむ <kbd>N</kbd></button></div>}<div className="result-actions"><button className="secondary-button shortcut-button" onClick={() => dispatch({ type: "SHOW_MAP" })}><strong>海図へ</strong><small><kbd>M</kbd></small></button><button className="secondary-button shortcut-button" onClick={() => dispatch({ type: "START_STAGE", stageId: state.result.stage.id })}><strong>もう1回</strong><small><kbd>R</kbd></small></button></div></div></section>;
}

function ReleaseConfirmDialog({ state, dispatch }) {
  const fish = state.save.caughtFish.find((item) => item.id === state.releaseCandidateId);
  if (!fish) return null;
  const species = getFishSpecies(fish.speciesId);
  return <section className="release-confirm-overlay" role="alertdialog" aria-modal="true" aria-label="魚を海へ逃がす"><div className="release-confirm-card"><FishVisual caughtFish={fish} /><p className="eyebrow">海へ逃がす</p><h2>{species.name}を<br />海へ逃がす？</h2><p>水槽からはいなくなるよ。<br />図鑑の記録は残るよ。</p><div className="release-confirm-actions"><button className="secondary-button" onClick={() => dispatch({ type: "CANCEL_RELEASE" })}>キャンセル</button><button className="primary-button" onClick={() => dispatch({ type: "CONFIRM_RELEASE" })}>海へ逃がす</button></div></div></section>;
}
