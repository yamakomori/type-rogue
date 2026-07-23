import { useEffect, useReducer } from "react";
import { STAGES, getStage } from "../../domain/curriculum.js";
import { ITEMS, getItem } from "../../domain/economy.js";
import { getFingerGuide } from "../../domain/fingers.js";
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
        if (event.key.toLowerCase() === "n" && state.result?.unlockedStageId) dispatch({ type: "START_STAGE", stageId: state.result.unlockedStageId });
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
  const content = state.screen === "typing" ? <TypingScreen state={state} dispatch={dispatch} />
    : state.screen === "wardrobe" ? <WardrobeScreen state={state} dispatch={dispatch} />
      : state.screen === "settings" ? <SettingsScreen state={state} dispatch={dispatch} />
        : <MapScreen state={state} dispatch={dispatch} isDev={import.meta.env.DEV} />;

  return <>
    <Header save={state.save} onMap={() => navigation("SHOW_MAP")} onWardrobe={() => navigation("SHOW_WARDROBE")} onSettings={() => navigation("SHOW_SETTINGS")} />
    {content}
    {state.screen === "result" && <RewardOverlay state={state} dispatch={dispatch} />}
  </>;
}

function Header({ save, onMap, onWardrobe, onSettings }) {
  return <header className="topbar"><button className="brand" onClick={onMap} aria-label="地図へ">ことばの小さな冒険</button><div className="topbar-actions"><span className="coin" aria-label={`コイン ${save.coins}`}>◌ {save.coins}</span><button className="icon-button" onClick={onWardrobe} aria-label="着せ替え">♧</button><button className="icon-button" onClick={onSettings} aria-label="設定">⚙</button></div></header>;
}

function Avatar({ save }) {
  const body = getItem(save.equipped.bodyColor);
  const head = getItem(save.equipped.head);
  const outfit = getItem(save.equipped.outfit);
  const headMark = head?.kind === "leaf" ? "◆" : head?.kind === "star" ? "★" : "";
  return <div className="avatar" aria-label="あなたの相棒"><div className="avatar-headmark">{headMark}</div><div className="avatar-head" style={{ background: body?.color ?? "#88a97a" }} /><div className="avatar-body" style={{ background: outfit?.color ?? "#ece3cc" }} /><span className="avatar-eye left" /><span className="avatar-eye right" /></div>;
}

function MapScreen({ state, dispatch, isDev }) {
  return <section className="map-screen"><div className="map-hero"><div><p className="eyebrow">はじまりの庭</p><h1>今日は、どの灯りへ行く？</h1><p>1回は、3つの小さな問題だけ。</p></div><Avatar save={state.save} /></div><div className="path-line" aria-hidden="true" /><div className="stage-list">{STAGES.map((stage, index) => {
    const unlocked = state.save.unlockedStageIds.includes(stage.id);
    const current = state.save.currentStageId === stage.id;
    const plays = state.save.stagePlayCounts[stage.id] ?? 0;
    return <article key={stage.id} className={`stage-card ${unlocked ? "" : "locked"} ${current ? "current" : ""}`}><span className="stage-number">{String(index + 1).padStart(2, "0")}</span><div><h2>{unlocked ? stage.name : "まだ とおれない みち"}</h2><p>{unlocked ? stage.description : "ひとつ前の道を あるくと、ひらくよ。"}</p>{unlocked && <div className="stage-progress"><small>{plays} 回あるいた</small><StageMedals medals={state.save.stageMedals[stage.id]} /></div>}</div><button className="secondary-button" disabled={!unlocked} onClick={() => dispatch({ type: "START_STAGE", stageId: stage.id })}>{current ? "つづきへ" : "あるく"}</button></article>;
  })}</div>{isDev && <details className="dev-stage-selector"><summary>開発用: 試すステージを選ぶ</summary><div>{STAGES.map((stage) => <button key={stage.id} className="secondary-button" onClick={() => dispatch({ type: "DEV_START_STAGE", stageId: stage.id })}>{stage.id}</button>)}</div></details>}</section>;
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
  const { stage, index, problems, attempt, feedback } = state.session;
  const display = attempt.matcher.display();
  const finger = getFingerGuide(display.next);
  const companionText = attempt.completed ? "みつけた！ 次の道へすすむよ。" : feedback || (finger.label ? `${finger.label}で ${display.next === " " ? "Space" : display.next.toUpperCase()} を おそう。` : "つぎのキーを、ゆっくりさがそう。");
  return <section className={`typing-screen ${state.save.settings.reducedMotion ? "reduce-motion" : ""}`}><div className="typing-top"><button className="text-button" onClick={() => dispatch({ type: "SHOW_MAP" })}>← 地図へ</button><span>灯り {index + 1} / {problems.length}</span></div><div className="typing-stage"><p className="eyebrow">{stage.name}</p><p className="problem-title">{attempt.problem.title}</p><p className="problem-text" aria-label="入力する文字">{attempt.problem.text}</p><p className="input-guide" aria-label="ローマ字入力"><span className="typed">{display.typed || "\u00a0"}</span><span className="next">{display.next}</span><span className="rest">{display.rest}</span></p>{attempt.completed && <p className="clear-message">灯りが つぎの道を 照らしている…</p>}</div>{state.save.settings.keyboardGuide && <KeyboardGuide expected={display.next} finger={finger} save={state.save} companionText={companionText} />}</section>;
}

function KeyboardGuide({ expected, finger, save, companionText }) {
  return <div className="keyboard-area"><aside className="guide-companion" aria-live="polite"><Avatar save={save} /><p className="speech-bubble">{companionText}</p></aside><div className="keyboard-guide" aria-label="キーボードガイド">{KEY_ROWS.map((row) => <div className="key-row" key={row.join("")}>{row.map((key) => <span key={key} className={`keycap ${expected === key ? "expected" : ""}`}>{key.toUpperCase()}</span>)}</div>)}<div className="key-row"><span className={`keycap space ${expected === " " ? "expected" : ""}`}>SPACE</span></div><div className="finger-guide" aria-label="使う指のガイド"><Hand side="left" active={finger} /><Hand side="right" active={finger} /></div></div></div>;
}

function Hand({ side, active }) {
  const name = side === "left" ? "左手" : "右手";
  return <div className="hand-group"><span className="hand-label">{name}</span><div className={`hand ${side}`} aria-label={`${name}の指`}><span className="palm" />{["pinky", "ring", "middle", "index", "thumb"].map((finger) => <span key={finger} className={`finger ${finger} ${active.finger === finger && (active.side === side || active.side === "both") ? "active" : ""}`} />)}</div></div>;
}

function WardrobeScreen({ state, dispatch }) {
  return <section className="wardrobe-screen"><div className="screen-heading"><div><p className="eyebrow">相棒のもちもの</p><h1>今日は、なにを身につける？</h1><p>{state.message || "問題を終えると、コインが見つかるよ。"}</p></div><Avatar save={state.save} /></div><div className="item-grid">{ITEMS.map((item) => { const owned = state.save.ownedItemIds.includes(item.id); const equipped = state.save.equipped[item.slot] === item.id; const visual = item.kind === "leaf" ? "◆" : item.kind === "star" ? "★" : "●"; return <article key={item.id} className={`item-card ${equipped ? "equipped" : ""}`}><div className="item-preview" style={item.color ? { "--item-color": item.color } : undefined}>{visual}</div><h2>{item.name}</h2><p>{item.slot === "bodyColor" ? "からだの色" : item.slot === "head" ? "あたま" : "ふく"}</p><button className="secondary-button" disabled={equipped} onClick={() => dispatch({ type: "PURCHASE_OR_EQUIP", itemId: item.id })}>{equipped ? "つけている" : owned ? "つける" : `${item.price} コインで みつける`}</button></article>; })}</div><button className="text-button back-button" onClick={() => dispatch({ type: "SHOW_MAP" })}>← 地図へもどる</button></section>;
}

function SettingsScreen({ state, dispatch }) {
  return <section className="settings-screen"><p className="eyebrow">設定</p><h1>遊びやすくする</h1><div className="settings-list"><button className="setting-row" onClick={() => dispatch({ type: "TOGGLE_GUIDE" })}><span>キーボードガイド</span><strong>{state.save.settings.keyboardGuide ? "表示中" : "非表示"}</strong></button><button className="setting-row" onClick={() => dispatch({ type: "TOGGLE_MOTION" })}><span>動きをひかえめにする</span><strong>{state.save.settings.reducedMotion ? "オン" : "オフ"}</strong></button></div><button className="danger-button" onClick={() => window.confirm("冒険のきろくを最初からにしますか？") && dispatch({ type: "RESET" })}>冒険のきろくを最初からにする</button><button className="text-button back-button" onClick={() => dispatch({ type: "SHOW_MAP" })}>← 地図へもどる</button></section>;
}

function RewardOverlay({ state, dispatch }) {
  const nextName = state.result.unlockedStageId ? getStage(state.result.unlockedStageId).name : null;
  const earned = state.result.newlyEarnedMedals;
  return <section className="reward-overlay" role="dialog" aria-modal="true" aria-label="見つけたもの"><div className="reward-card"><div className="result-glow">✦</div><Avatar save={state.save} /><p className="eyebrow">小さな発見</p><h1>コインを {state.result.earned.coins} こ<br />みつけた！</h1><div className="found-item"><span>◌</span><strong>ひかりのコイン</strong><small>+{state.result.earned.coins}</small></div>{(earned.careful || earned.speed || earned.gold) && <div className="new-medals"><span>あたらしいメダル</span><StageMedals medals={earned} onlyEarned /></div>}<p>{state.result.accuracy >= 0.85 ? "ゆっくり、ていねいに歩けたね。" : "最後まで あるけたね。すてき！"}</p>{nextName && <div className="next-route-group"><div><span>あたらしい道が ひらいた！</span><strong>{nextName}</strong></div><button className="primary-button route-button" onClick={() => dispatch({ type: "START_STAGE", stageId: state.result.unlockedStageId })}>すすむ <kbd>N</kbd></button></div>}<div className="result-actions"><button className="secondary-button shortcut-button" onClick={() => dispatch({ type: "SHOW_MAP" })}><strong>地図へ</strong><small><kbd>M</kbd></small></button><button className="secondary-button shortcut-button" onClick={() => dispatch({ type: "START_STAGE", stageId: state.result.stage.id })}><strong>もう1回</strong><small><kbd>R</kbd></small></button></div></div></section>;
}
