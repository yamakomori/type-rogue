import { useEffect, useReducer, useRef } from "react";
import { STAGES, getStage } from "../../domain/curriculum.js";
import { ITEMS, getItem } from "../../domain/economy.js";
import { getFingerGuide } from "../../domain/fingers.js";
import {
  AQUARIUM_COMPACT_VISIBLE_FISH_LIMIT,
  AQUARIUM_VISIBLE_FISH_LIMIT,
  fishCollectionStats,
  fishCountsBySpecies,
  fishDiscovery,
  fishForCatch,
  fishSpeciesForRegion,
  getFishSpecies,
  selectAquariumFish,
} from "../../domain/fish.js";
import { learningConceptLabel, reviewConceptsForStage, reviewKeysForStage } from "../../domain/learning.js";
import { getPracticeKeysForStage } from "../../domain/problems.js";
import { getRegion, getRegionForStage, getUnlockedRegions } from "../../domain/regions.js";
import { loadSave, persistSave } from "../../domain/save.js";
import { createGameState, gameReducer } from "../../game/state/gameReducer.js";
import { UiIcon, UiText } from "./UiPrimitives.jsx";
import "../../styles.css";

const KEY_ROWS = [
  ["q", "w", "e", "r", "t", "y", "u", "i", "o", "p", "-"],
  ["a", "s", "d", "f", "g", "h", "j", "k", "l"],
  ["z", "x", "c", "v", "b", "n", "m", ",", ".", "/"],
];

const AQUARIUM_SLOT_ORDER = [
  7, 16, 3, 20, 11, 12, 23, 0, 18, 5, 14, 9,
  21, 2, 17, 6, 22, 10, 13, 4, 19, 1, 15, 8,
];

function aquariumPosition(index, seed = 0) {
  const slot = AQUARIUM_SLOT_ORDER[index % AQUARIUM_SLOT_ORDER.length];
  const col = slot % 6;
  const row = Math.floor(slot / 6);
  // Scatter each fish off the grid lines so the tank doesn't look like a spreadsheet.
  const jitterX = (seed % 11) - 5;          // -5%..+5%
  const jitterY = ((seed >> 3) % 13) - 6;   // -6%..+6%
  return {
    left: `${4 + col * 15.8 + jitterX}%`,
    top: `${8 + row * 21 + jitterY}%`,
  };
}

function stableFishNumber(caughtFish) {
  const value = caughtFish?.id ?? caughtFish?.speciesId ?? "";
  return [...value].reduce((total, character) => ((total * 31) + character.charCodeAt(0)) >>> 0, 0);
}

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
        if (event.key === "Escape") dispatch({ type: "SHOW_MAP" });
        if (event.key.toLowerCase() === "m") dispatch({ type: "SHOW_MAP" });
        if (event.key.toLowerCase() === "r") dispatch({ type: "START_STAGE", stageId: state.result?.stage.id ?? state.save.currentStageId });
        if (event.key.toLowerCase() === "n" && state.result?.nextStageId) dispatch({ type: "START_STAGE", stageId: state.result.nextStageId });
        return;
      }
      if ((state.screen === "map" || state.screen === "aquarium") && (event.key === "ArrowLeft" || event.key === "ArrowRight")) {
        const regions = getUnlockedRegions(state.save.unlockedStageIds);
        const selectedId = state.screen === "map" ? state.selectedMapRegionId : state.selectedTankId;
        const currentIndex = regions.findIndex((region) => region.id === selectedId);
        const direction = event.key === "ArrowLeft" ? -1 : 1;
        const next = regions[currentIndex + direction];
        if (next) {
          event.preventDefault();
          dispatch({
            type: state.screen === "map" ? "SELECT_MAP_REGION" : "SELECT_TANK",
            regionId: next.id,
          });
        }
        return;
      }
      if (state.screen !== "typing" || event.key.length !== 1) return;
      event.preventDefault();
      dispatch({ type: "TYPE_KEY", key: event.key.toLowerCase(), now: Date.now() });
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [
    state.screen,
    state.session,
    state.save.currentStageId,
    state.save.unlockedStageIds,
    state.selectedMapRegionId,
    state.selectedTankId,
  ]);

  const navigation = (type) => dispatch({ type });
  const content = state.screen === "intro" ? <IntroScreen state={state} dispatch={dispatch} />
    : state.screen === "typing" ? <TypingScreen state={state} dispatch={dispatch} />
    : state.screen === "aquarium" ? <AquariumScreen state={state} dispatch={dispatch} />
      : state.screen === "wardrobe" ? <WardrobeScreen state={state} dispatch={dispatch} />
      : state.screen === "settings" ? <SettingsScreen state={state} dispatch={dispatch} />
        : <MapScreen state={state} dispatch={dispatch} isDev={import.meta.env.DEV} />;
  const backdropRegionId = state.screen === "typing" ? state.session?.stage.regionId
    : state.screen === "map" ? state.selectedMapRegionId
      : state.screen === "aquarium" ? state.selectedTankId
      : state.screen === "result" ? state.result?.stage.regionId
        : null;

  return <div className={`app-shell ${backdropRegionId ? `region-backdrop-${backdropRegionId}` : ""} ${state.save.settings.reducedMotion ? "reduce-motion" : ""}`}>
    {state.screen !== "intro" && <Header save={state.save} onMap={() => navigation("SHOW_MAP")} onAquarium={() => navigation("SHOW_AQUARIUM")} onWardrobe={() => navigation("SHOW_WARDROBE")} onSettings={() => navigation("SHOW_SETTINGS")} />}
    {content}
    {state.screen === "result" && <RewardOverlay state={state} dispatch={dispatch} />}
    {state.releaseCandidateId && <ReleaseConfirmDialog state={state} dispatch={dispatch} />}
  </div>;
}

function Header({ save, onMap, onAquarium, onWardrobe, onSettings }) {
  return <header className="topbar">
    <button className="brand" onClick={onMap}>
      <UiIcon name="map" />
      <span><UiText>海をえらぶ</UiText></span>
    </button>
    <div className="topbar-actions">
      <span className="coin" aria-label={`コイン ${save.coins}`}><UiIcon name="coin" size={16} />{save.coins}</span>
      <button className="nav-button" onClick={onAquarium}><UiIcon name="aquarium" /><span><UiText>水槽</UiText></span></button>
      <button className="nav-button" onClick={onWardrobe}><UiIcon name="wardrobe" /><span>きせかえ</span></button>
      <button className="nav-button" onClick={onSettings}><UiIcon name="settings" /><span><UiText>設定</UiText></span></button>
    </div>
  </header>;
}

function IntroScreen({ state, dispatch }) {
  return <main className="intro-screen"><div className="intro-card"><Avatar save={state.save} /><p className="eyebrow"><UiText>ことばの小さな海へようこそ</UiText></p><h1>F と J のぽっちを<br />さわってみよう</h1><p><UiText>3つの短い問題を打つと、</UiText><br /><UiText>最初の魚に会えるよ。</UiText></p><button className="primary-button intro-start" onClick={() => dispatch({ type: "BEGIN_INTRO" })}>はじめる</button><button className="text-button intro-skip" onClick={() => dispatch({ type: "SKIP_INTRO" })}><UiText>レッスンをえらぶ</UiText></button></div></main>;
}

function Avatar({ save }) {
  const body = getItem(save.equipped.bodyColor);
  const head = getItem(save.equipped.head);
  const outfit = getItem(save.equipped.outfit);
  const headMark = head?.kind === "leaf" ? "◆" : head?.kind === "star" ? "★" : "";
  return <div className="avatar" aria-label="あなたの相棒"><div className="avatar-headmark">{headMark}</div><div className="avatar-head" style={{ background: body?.color ?? "#88a97a" }} /><div className="avatar-body" style={{ background: outfit?.color ?? "#ece3cc" }} /><span className="avatar-eye left" /><span className="avatar-eye right" /></div>;
}

function RegionNavigator({ regions, selectedId, onSelect, label }) {
  const currentIndex = Math.max(0, regions.findIndex((region) => region.id === selectedId));
  const previous = regions[currentIndex - 1];
  const next = regions[currentIndex + 1];

  return <nav className="region-navigation" aria-label={label}>
    <div className="region-arrow-slot">
      {previous && <button className="region-arrow previous" onClick={() => onSelect(previous.id)} aria-label={`前の海、${previous.name}へ`}>
        <UiIcon name="chevronLeft" size={24} />
        <span><small><UiText>前の海</UiText></small><strong><UiText>{previous.name}</UiText></strong></span>
      </button>}
    </div>
    <div className="region-dots" role="tablist" aria-label={label}>
      {regions.map((region, index) => <button
        key={region.id}
        role="tab"
        aria-label={`${region.name}へ`}
        aria-selected={region.id === selectedId}
        className={`region-dot ${region.id === selectedId ? "selected" : ""}`}
        onClick={() => onSelect(region.id)}
      ><span>{String(index + 1).padStart(2, "0")}</span><UiText>{region.name}</UiText></button>)}
    </div>
    <div className="region-arrow-slot next-slot">
      {next && <button className="region-arrow next" onClick={() => onSelect(next.id)} aria-label={`次の海、${next.name}へ`}>
        <span><small><UiText>次の海</UiText></small><strong><UiText>{next.name}</UiText></strong></span>
        <UiIcon name="chevronRight" size={24} />
      </button>}
    </div>
  </nav>;
}

function MapScreen({ state, dispatch, isDev }) {
  const unlockedRegions = getUnlockedRegions(state.save.unlockedStageIds);
  const region = getRegion(state.selectedMapRegionId);
  const tankFish = state.save.caughtFish.filter((fish) => (fish.regionId ?? getFishSpecies(fish.speciesId).regionId) === region.id);
  const regionStages = STAGES.filter((stage) => stage.regionId === region.id);
  const selectRegion = (regionId) => dispatch({ type: "SELECT_MAP_REGION", regionId });
  return <section className={`map-screen region-${region.id}`}>
    <div className="map-hero sea-hero">
      <div className="map-hero-copy">
        <p className="eyebrow"><UiText>海をえらぶ</UiText></p>
        <h1><UiText>{region.name}</UiText></h1>
        <p><UiText>{region.description}</UiText></p>
      </div>
      <div className="aquarium-feature">
        <AquariumPreview fish={tankFish} emptyMessage="海へ出ると、魚に出会えるよ。" compact />
        <button className="aquarium-attached-button" onClick={() => dispatch({ type: "SHOW_AQUARIUM", regionId: region.id })}>
          <UiIcon name="aquarium" />
          <strong><UiText>水槽をみる</UiText></strong>
          <small><UiText>{tankFish.length} 匹</UiText></small>
        </button>
      </div>
    </div>
    {unlockedRegions.length > 1 && <RegionNavigator regions={unlockedRegions} selectedId={region.id} onSelect={selectRegion} label="海域を選ぶ" />}
    <div className="section-intro">
      <p className="eyebrow"><UiText>{region.name}</UiText></p>
      <h2><UiText>レッスンをえらぼう</UiText></h2>
    </div>
    <div className="stage-list">{regionStages.map((stage, index) => {
    const unlocked = state.save.unlockedStageIds.includes(stage.id);
    const current = state.save.currentStageId === stage.id;
    const plays = state.save.stagePlayCounts[stage.id] ?? 0;
    const discovery = fishDiscovery(state.save.discoveredFishSpeciesIds, [stage.id]);
    const reviewKeys = current ? reviewKeysForStage(state.save.skills, getPracticeKeysForStage(stage.id), stage.focusTags?.length ? 1 : 2) : [];
    const reviewConcepts = current ? reviewConceptsForStage(state.save.conceptSkills, stage.focusTags) : [];
    return <article key={stage.id} className={`stage-card ${unlocked ? "" : "locked"} ${current ? "current" : ""}`}>
      <span className="stage-number">{String(index + 1).padStart(2, "0")}</span>
      <div className="stage-copy">
        <h3><UiText>{unlocked ? stage.name : "まだ いけない 海"}</UiText></h3>
        <p><UiText>{unlocked ? stage.description : "ひとつ前の海で 魚をつると、ひらくよ。"}</UiText></p>
        {unlocked && <div className="stage-progress">
          <small><UiText>{plays} 回つりをした</UiText></small>
          <small className="fish-discovery"><UiText>出会った魚</UiText> {discovery.discovered}/{discovery.total}</small>
          {reviewKeys.length > 0 && <small className="review-current"><UiText>次の{stage.problemCount ?? 3}問で練習するキー：</UiText>{reviewKeys.map((key) => key.toUpperCase()).join("・")}</small>}
          {reviewConcepts.length > 0 && <small className="review-current"><UiText>次の{stage.problemCount ?? 3}問で練習することば：{reviewConcepts.map(learningConceptLabel).join("・")}</UiText></small>}
          <StageMedals medals={state.save.stageMedals[stage.id]} />
        </div>}
      </div>
      <button className={`stage-action ${current ? "primary" : ""}`} disabled={!unlocked} onClick={() => dispatch({ type: "START_STAGE", stageId: stage.id })}>
        <span>{current ? "ここから" : "はじめる"}</span><UiIcon name="play" />
      </button>
    </article>;
  })}</div>
    {isDev && <details className="dev-stage-selector"><summary><UiText>開発用: 試すステージを選ぶ</UiText></summary><div>{STAGES.map((stage) => <button key={stage.id} className="secondary-button" onClick={() => dispatch({ type: "DEV_START_STAGE", stageId: stage.id })}>{stage.id}</button>)}</div></details>}
  </section>;
}

function FishVisual({ caughtFish, className = "", index = 0, muted = false, isNew = false, position: requestedPosition, roaming = false, nodeRef }) {
  const species = getFishSpecies(caughtFish?.speciesId);
  const position = requestedPosition ?? { left: `${9 + ((index * 19) % 76)}%`, top: `${20 + ((index * 23) % 54)}%` };
  const spriteStyle = species.sprite ? {
    "--sprite-image": `url("${species.sprite.src}")`,
    "--sprite-duration": `${species.sprite.frames * species.sprite.frameMs}ms`,
  } : {};
  return <span ref={nodeRef} className={`fish-visual ${species.sprite ? "has-sprite" : ""} ${species.shape} ${caughtFish?.size ?? "medium"} ${caughtFish?.variant ?? "common"} movement-${species.movement ?? "cruise"} ${roaming ? "roaming" : ""} ${className} ${muted ? "muted" : ""}`} style={{ "--fish": species.color, "--accent": species.accent, ...spriteStyle, ...position }} aria-label={muted ? "近づいている魚影" : species.name}><span className="fish-art">{species.sprite ? <span className="fish-sprite" aria-hidden="true" /> : <><span className="fish-tail" /><span className="fish-body" /><span className="fish-eye" /></>}</span>{caughtFish?.variant === "gold" && <span className="fish-crown">⌁</span>}{isNew && <span className="new-fish-badge">NEW</span>}</span>;
}

// Deterministic PRNG (mulberry32) so each fish wanders the same way across renders.
function makeFishRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Each fish roams to random waypoints inside the tank, clamped to the frame, and
// only turns to face a new target when it lies clearly to its other side (throttled).
function useAquariumRoaming(containerRef, nodesRef, metaRef, signature) {
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return undefined;
    const meta = metaRef.current;
    const nodes = nodesRef.current;

    const fishes = meta.map((info, i) => {
      const node = nodes[i];
      const random = makeFishRandom(info.seed || i + 1);
      const x = parseFloat(info.base.left) || 10;
      const y = parseFloat(info.base.top) || 20;
      const slow = info.drift ? 0.55 : 1;
      return {
        node,
        random,
        sourceFacing: info.sourceFacing,
        x, y, tx: x, ty: y,
        facing: random() < 0.5 ? 1 : -1,
        speed: (1.6 + random() * 2.2) * slow,      // % of tank per second
        bobAmp: (info.drift ? 1.1 : 0.5) + random() * 0.6,
        bobFreq: 0.4 + random() * 0.5,
        phase: random() * Math.PI * 2,
        nextRetargetAt: 0,
        lastFlipAt: -1e4,
      };
    });

    const boundsFor = (fish) => {
      const width = container.clientWidth || 1;
      const height = container.clientHeight || 1;
      const wPct = ((fish.node?.offsetWidth ?? 52) / width) * 100;
      const hPct = ((fish.node?.offsetHeight ?? 34) / height) * 100;
      const xMin = 1.5;
      const yMin = 4;
      return { xMin, xMax: Math.max(xMin, 98.5 - wPct), yMin, yMax: Math.max(yMin, 84 - hPct) };
    };

    const place = (fish) => {
      if (fish.node) {
        fish.node.style.left = `${fish.x}%`;
        fish.node.style.top = `${fish.y}%`;
        fish.node.classList.toggle("is-flipped", (fish.facing === -1 ? "left" : "right") !== fish.sourceFacing);
      }
    };

    const reduce = typeof window !== "undefined" && window.matchMedia
      && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // Clamp the initial scattered position so no fish starts outside the frame.
    fishes.forEach((fish) => {
      const { xMin, xMax, yMin, yMax } = boundsFor(fish);
      fish.x = Math.min(xMax, Math.max(xMin, fish.x));
      fish.y = Math.min(yMax, Math.max(yMin, fish.y));
      fish.tx = fish.x;
      fish.ty = fish.y;
    });

    if (reduce) {
      fishes.forEach(place);
      return undefined;
    }

    const retarget = (fish, now) => {
      const { xMin, xMax, yMin, yMax } = boundsFor(fish);
      fish.tx = xMin + fish.random() * (xMax - xMin);
      fish.ty = yMin + fish.random() * (yMax - yMin);
      fish.nextRetargetAt = now + 3200 + fish.random() * 4200;
      const dx = fish.tx - fish.x;
      if (Math.abs(dx) > 9) {
        const desired = dx > 0 ? 1 : -1;
        if (desired !== fish.facing && now - fish.lastFlipAt > 2600) {
          fish.facing = desired;
          fish.lastFlipAt = now;
        }
      }
    };

    let raf = 0;
    let last = performance.now();
    fishes.forEach((fish) => {
      place(fish);
      fish.nextRetargetAt = last + fish.random() * 1400;
    });

    const frame = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      for (const fish of fishes) {
        if (!fish.node) continue;
        if (now >= fish.nextRetargetAt) retarget(fish, now);
        const dx = fish.tx - fish.x;
        const dy = fish.ty - fish.y;
        const dist = Math.hypot(dx, dy);
        if (dist < 0.6) {
          fish.nextRetargetAt = Math.min(fish.nextRetargetAt, now + 200 + fish.random() * 500);
        } else {
          const move = Math.min(dist, fish.speed * dt);
          fish.x += (dx / dist) * move;
          fish.y += (dy / dist) * move;
        }
        const bob = Math.sin((now / 1000) * fish.bobFreq + fish.phase) * fish.bobAmp;
        fish.node.style.left = `${fish.x}%`;
        fish.node.style.top = `${fish.y + bob}%`;
        fish.node.classList.toggle("is-flipped", (fish.facing === -1 ? "left" : "right") !== fish.sourceFacing);
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [signature]);
}

function AquariumPreview({ fish = [], emptyMessage, compact = false }) {
  const limit = compact ? AQUARIUM_COMPACT_VISIBLE_FISH_LIMIT : AQUARIUM_VISIBLE_FISH_LIMIT;
  const visibleFish = selectAquariumFish(fish, limit);
  const ariaLabel = visibleFish.length < fish.length
    ? `水槽。${fish.length} 匹のうち ${visibleFish.length} 匹を表示`
    : `水槽。つかまえた魚 ${fish.length} 匹`;
  const containerRef = useRef(null);
  const nodesRef = useRef([]);
  const metaRef = useRef([]);
  metaRef.current = visibleFish.map((caughtFish, index) => {
    const species = getFishSpecies(caughtFish.speciesId);
    return {
      seed: stableFishNumber(caughtFish),
      sourceFacing: species.sprite?.sourceFacing ?? "right",
      drift: (species.movement ?? "cruise") === "drift",
      base: aquariumPosition(index, stableFishNumber(caughtFish)),
    };
  });
  useAquariumRoaming(containerRef, nodesRef, metaRef, visibleFish.map((f) => f.id).join(","));
  return <div ref={containerRef} className="aquarium-preview" aria-label={ariaLabel}><div className="water-shine" />{visibleFish.length > 0 ? visibleFish.map((caughtFish, index) => <FishVisual key={caughtFish.id} caughtFish={caughtFish} index={index} roaming position={metaRef.current[index].base} nodeRef={(el) => { nodesRef.current[index] = el; }} />) : <p><span><UiText>{emptyMessage}</UiText></span></p>}<span className="aquarium-sand" /></div>;
}

function UnknownFishVisual() {
  return <span className="unknown-fish-visual" role="img" aria-label="未発見の生き物"><img src="/sprites/unknown-fish.png" alt="" /></span>;
}

function StageMedals({ medals = {}, onlyEarned = false }) {
  const definitions = [
    { key: "careful", title: "ていねいさメダル", hint: "ミスを すくなく うつ" },
    { key: "speed", title: "スピードメダル", hint: "すばやく うつ" },
    { key: "gold", title: "ゴールドメダル", hint: "ふたつとも できる" },
  ];
  const visible = onlyEarned ? definitions.filter((medal) => medals[medal.key]) : definitions;
  return <div className="stage-medals" aria-label={`ていねいさ: ${medals.careful ? "獲得" : "未獲得"}、スピード: ${medals.speed ? "獲得" : "未獲得"}、ゴールド: ${medals.gold ? "獲得" : "未獲得"}`}>{visible.map((medal) => {
    const status = medals[medal.key] ? "獲得済み" : "未獲得";
    return <span
      key={medal.key}
      className="medal-tooltip"
      data-tooltip={`${medal.title}：${medal.hint}（${status}）`}
      aria-label={`${medal.title}、${medal.hint}、${status}`}
      role="img"
      tabIndex={0}
    >
      <span className={`medal ${medal.key} ${medals[medal.key] ? "earned" : ""}`}><MedalPattern type={medal.key} /></span>
    </span>;
  })}</div>;
}

function MedalPattern({ type }) {
  return <svg className="medal-pattern" viewBox="0 0 16 16" shapeRendering="crispEdges" aria-hidden="true">
    {type === "speed" && <>
      <path d="M1 2h10v3H1zM5 7h10v3H5zM1 12h10v2H1z" />
      <path className="medal-pattern-detail" d="M12 2h3v3h-3zM1 7h2v3H1zM12 12h3v2h-3z" />
    </>}
    {type === "careful" && <>
      <path d="M3 1h7v2H3v2H1V3h2zM10 3h2v2h2v5h-2V5h-2zM1 5h2v7H1zM3 12h5v2H3zM5 5h5v5H5z" />
      <path className="medal-pattern-detail" d="M6 9h2v2h2v2h2v-2h2V9h2v4h-2v2h-4v-2H8v-2H6z" />
    </>}
    {type === "gold" && <>
      <path d="M1 3h3v3h2V1h4v5h2V3h3v10H1z" />
      <path className="medal-pattern-detail" d="M3 9h10v2H3zM5 5h2v2H5zM9 5h2v2H9z" />
    </>}
  </svg>;
}

function TypingScreen({ state, dispatch }) {
  const { stage, index, problems, attempt, feedback, reviewKeys, reviewConcepts } = state.session;
  const display = attempt.matcher.display();
  const finger = getFingerGuide(display.next);
  const companionText = attempt.completed ? "みつけた！ 魚影が近づいているよ。" : feedback || (finger.label ? `${finger.label}で ${display.next === " " ? "Space" : display.next.toUpperCase()} を おそう。` : "つぎのキーを、ゆっくりさがそう。");
  const fishProgress = (index + (attempt.completed ? 1 : 0)) / problems.length;
  const currentReviewKeys = reviewKeys.filter((key) => attempt.problem.targetKeys.includes(key));
  const currentReviewConcepts = reviewConcepts.filter((tag) => attempt.problem.learningTags?.includes(tag));
  return <section className={`typing-screen region-${stage.regionId} ${state.save.settings.reducedMotion ? "reduce-motion" : ""}`}>
    <div className="typing-top">
      <button className="text-button exit-lesson-button" onClick={() => dispatch({ type: "SHOW_MAP" })}><UiIcon name="chevronLeft" size={18} /><span>やめる</span></button>
      <span className="typing-count"><UiText>つり</UiText> <strong>{index + 1}</strong> / {problems.length}</span>
    </div>
    <div className="typing-stage sea-typing-stage">
      <FishingProgress progress={fishProgress} stageId={stage.id} />
      <p className="eyebrow"><UiText>{stage.name}</UiText></p>
      <div className="practice-notes">
        {currentReviewKeys.length > 0 && <p className="practice-key"><UiText>この問題で練習するキー：</UiText>{currentReviewKeys.map((key) => key.toUpperCase()).join("・")}</p>}
        {currentReviewConcepts.length > 0 && <p className="practice-key"><UiText>この問題で練習することば：{currentReviewConcepts.map(learningConceptLabel).join("・")}</UiText></p>}
      </div>
      <p className="problem-title"><UiText>{attempt.problem.title}</UiText></p>
      <p className="problem-text" aria-label="入力する文字">{attempt.problem.text}</p>
      <p className="input-guide" aria-label="ローマ字入力"><span className="input-guide-typed">{display.typed}</span><span className="input-guide-next">{display.next}</span><span className="input-guide-rest">{display.rest}</span></p>
    </div>
    {state.save.settings.keyboardGuide && <div className="keyboard-section">
      <div className="keyboard-section-label"><span /><UiText>つぎに おす キー</UiText><span /></div>
      <KeyboardGuide expected={display.next} finger={finger} save={state.save} companionText={companionText} />
    </div>}
  </section>;
}

function FishingProgress({ progress, stageId }) {
  const positions = { "--progress": progress, "--line-height": `${48 + progress * 42}%`, "--fish-left": `${74 - progress * 42}%`, "--fish-top": `${56 - progress * 24}%`, "--fish-opacity": .25 + progress * .75 };
  const fish = fishForCatch({ stageId, playCount: 1 });
  return <div className="fishing-progress" style={positions} aria-label={`魚が ${Math.round(progress * 100)} パーセント近づいています`}><span className="fishing-line" /><FishVisual caughtFish={fish} muted={progress < 1} /></div>;
}

function KeyboardGuide({ expected, finger, save, companionText }) {
  return <div className="keyboard-area"><aside className="guide-companion" aria-live="polite"><Avatar save={save} /><p className="speech-bubble"><UiText>{companionText}</UiText></p></aside><div className="keyboard-guide" aria-label="キーボードガイド">{KEY_ROWS.map((row) => <div className="key-row" key={row.join("")}>{row.map((key) => <span key={key} className={`keycap ${expected === key ? "expected" : ""}`}>{key.toUpperCase()}</span>)}</div>)}<div className="key-row"><span className={`keycap space ${expected === " " ? "expected" : ""}`}>SPACE</span></div><div className="finger-guide" aria-label="使う指のガイド"><Hand side="left" active={finger} /><Hand side="right" active={finger} /></div></div></div>;
}

function Hand({ side, active }) {
  const name = side === "left" ? "左手" : "右手";
  return <div className="hand-group"><span className="hand-label"><UiText>{name}</UiText></span><div className={`hand ${side}`} aria-label={`${name}の指`}><span className="palm" />{["pinky", "ring", "middle", "index", "thumb"].map((finger) => <span key={finger} className={`finger ${finger} ${active.finger === finger && (active.side === side || active.side === "both") ? "active" : ""}`} />)}</div></div>;
}

function WardrobeScreen({ state, dispatch }) {
  return <section className="wardrobe-screen">
    <div className="screen-heading">
      <div><p className="eyebrow"><UiText>相棒のもちもの</UiText></p><h1><UiText>今日は、なにを身につける？</UiText></h1><p><UiText>{state.message || "海で見つけたコインで、身じたくできるよ。"}</UiText></p></div>
      <Avatar save={state.save} />
    </div>
    <div className="item-grid">{ITEMS.map((item) => {
      const owned = state.save.ownedItemIds.includes(item.id);
      const equipped = state.save.equipped[item.slot] === item.id;
      const visual = item.kind === "leaf" ? "◆" : item.kind === "star" ? "★" : "●";
      return <article key={item.id} className={`item-card ${equipped ? "equipped" : ""}`}>
        <div className="item-preview" style={item.color ? { "--item-color": item.color } : undefined}>{visual}</div>
        <h2><UiText>{item.name}</UiText></h2>
        <p><UiText>{item.slot === "bodyColor" ? "からだの色" : item.slot === "head" ? "あたま" : "ふく"}</UiText></p>
        <button className="secondary-button" disabled={equipped} onClick={() => dispatch({ type: "PURCHASE_OR_EQUIP", itemId: item.id })}><UiText>{equipped ? "つけている" : owned ? "つける" : `${item.price} コインで みつける`}</UiText></button>
      </article>;
    })}</div>
    <button className="text-button back-button" onClick={() => dispatch({ type: "SHOW_MAP" })}><UiIcon name="chevronLeft" size={18} /><span><UiText>レッスンをえらぶ</UiText></span></button>
  </section>;
}

function AquariumScreen({ state, dispatch }) {
  const collection = fishCollectionStats(state.save.caughtFish);
  const unlockedRegions = getUnlockedRegions(state.save.unlockedStageIds);
  const region = getRegion(state.selectedTankId);
  const tankFish = state.save.caughtFish.filter((fish) => (fish.regionId ?? getFishSpecies(fish.speciesId).regionId) === region.id);
  const species = fishSpeciesForRegion(region.id);
  const discovery = fishDiscovery(state.save.discoveredFishSpeciesIds, region.stageIds);
  const counts = fishCountsBySpecies(tankFish);
  const selectTank = (regionId) => dispatch({ type: "SELECT_TANK", regionId });
  return <section className={`aquarium-screen region-${region.id}`}>
    <div className="screen-heading aquarium-heading">
      <div><p className="eyebrow"><UiText>あなたの水槽</UiText></p><h1><UiText>{region.tankName}</UiText></h1><p><UiText>{collection.total === 0 ? "海へ出ると、最初の魚に出会えるよ。" : `${tankFish.length} 匹が、この水槽を泳いでいるよ。`}</UiText></p></div>
      <Avatar save={state.save} />
    </div>
    {unlockedRegions.length > 1 && <RegionNavigator regions={unlockedRegions} selectedId={region.id} onSelect={selectTank} label="水槽を選ぶ" />}
    <div className="aquarium-main">
      <AquariumPreview fish={tankFish} emptyMessage="まだ魚はいないよ。最初の海へ出かけよう。" />
      <button className="aquarium-depart-button primary-button" onClick={() => dispatch({ type: "SHOW_MAP" })}><strong><UiText>海へ出かける</UiText></strong><UiIcon name="play" /></button>
    </div>
    <div className="collection-heading fish-book-heading"><div><p className="eyebrow"><UiText>海のずかん</UiText></p><h2><UiText>出会った魚</UiText> {discovery.discovered} / {discovery.total}</h2></div></div>
    <div className="fish-collection">{species.map((item) => {
      const count = counts[item.id] ?? 0;
      const discovered = state.save.discoveredFishSpeciesIds.includes(item.id);
      const releaseTarget = tankFish.find((fish) => fish.speciesId === item.id);
      return <article className={`fish-card ${discovered ? "" : "undiscovered"}`} key={item.id}>{discovered ? <FishVisual caughtFish={{ speciesId: item.id }} /> : <UnknownFishVisual />}<div><h3><UiText>{discovered ? item.name : "未発見の生き物"}</UiText></h3><p><UiText>{discovered ? (count > 0 ? `水槽に ${count} 匹` : "図鑑に記録されている") : "この海で待っているみたい"}</UiText></p>{count > 0 && releaseTarget && <button className="release-button" onClick={() => dispatch({ type: "REQUEST_RELEASE", fishId: releaseTarget.id })}><UiText>{count > 1 ? "1匹を海へ逃がす" : "海へ逃がす"}</UiText></button>}</div></article>;
    })}</div>
  </section>;
}

function SettingsScreen({ state, dispatch }) {
  return <section className="settings-screen">
    <p className="eyebrow"><UiText>設定</UiText></p>
    <h1><UiText>遊びやすくする</UiText></h1>
    <div className="settings-list">
      <button className="setting-row" onClick={() => dispatch({ type: "TOGGLE_GUIDE" })}><span><UiText>キーボードガイド</UiText></span><strong><UiText>{state.save.settings.keyboardGuide ? "表示中" : "非表示"}</UiText></strong></button>
      <button className="setting-row" onClick={() => dispatch({ type: "TOGGLE_MOTION" })}><span><UiText>動きをひかえめにする</UiText></span><strong>{state.save.settings.reducedMotion ? "オン" : "オフ"}</strong></button>
    </div>
    <button className="danger-button" onClick={() => window.confirm("冒険のきろくを最初からにしますか？") && dispatch({ type: "RESET" })}><UiText>冒険のきろくを最初からにする</UiText></button>
    <button className="text-button back-button" onClick={() => dispatch({ type: "SHOW_MAP" })}><UiIcon name="chevronLeft" size={18} /><span><UiText>レッスンをえらぶ</UiText></span></button>
  </section>;
}

function RewardOverlay({ state, dispatch }) {
  const nextName = state.result.nextStageId ? getStage(state.result.nextStageId).name : null;
  const nextStageWasJustUnlocked = state.result.unlockedStageId === state.result.nextStageId;
  const nextRegionWasJustUnlocked = nextStageWasJustUnlocked
    && getRegionForStage(state.result.nextStageId).id !== state.result.stage.regionId;
  const earned = state.result.newlyEarnedMedals;
  const fish = getFishSpecies(state.result.caughtFish.speciesId);
  if (state.result.firstCatch) {
    return <section className="reward-overlay" role="dialog" aria-modal="true" aria-label="最初につれた魚">
      <div className="reward-card first-catch-card">
        <button className="dialog-close" onClick={() => dispatch({ type: "SHOW_MAP" })} aria-label="レッスン一覧にもどる"><UiIcon name="close" size={20} /></button>
        <p className="eyebrow"><UiText>最初の魚</UiText></p>
        <FishVisual caughtFish={state.result.caughtFish} className="reward-fish" isNew />
        <h1><UiText>{fish.name}</UiText>が<br />つれた！</h1>
        <p><UiText>水槽につれてかえろう。</UiText></p>
        <button className="primary-button first-aquarium-button" onClick={() => dispatch({ type: "SHOW_AQUARIUM", regionId: state.result.caughtFish.regionId })}><UiIcon name="aquarium" /><UiText>水槽をみる</UiText></button>
        {nextName && <button className="secondary-button first-next-stage-button" onClick={() => dispatch({ type: "START_STAGE", stageId: state.result.nextStageId })}><UiText>次の海へ進む</UiText> <small><UiText>{nextName}</UiText> <kbd>N</kbd></small></button>}
      </div>
    </section>;
  }
  return <section className="reward-overlay" role="dialog" aria-modal="true" aria-label="つれた魚">
    <div className="reward-card fish-reward">
      <FishVisual caughtFish={state.result.caughtFish} className="reward-fish" isNew={state.result.isNewSpecies} />
      <h1><UiText>{fish.name}</UiText>が<br />つれた！</h1>
      <p className="result-message"><UiText>{state.result.accuracy >= 0.85 ? "ていねいに糸をたぐれたね。" : "最後までつれたね。すてき！"}</UiText></p>
      {(earned.careful || earned.speed || earned.gold) && <div className="new-medals"><span>あたらしいメダル</span><StageMedals medals={earned} onlyEarned /></div>}
      {nextName && <div className="next-route-group"><div><span><UiText>{nextRegionWasJustUnlocked ? "あたらしい海が ひらいた！" : nextStageWasJustUnlocked ? "あたらしい道が ひらいた！" : "次の海へ進めるよ"}</UiText></span><strong><UiText>{nextName}</UiText></strong></div><button className="primary-button route-button" onClick={() => dispatch({ type: "START_STAGE", stageId: state.result.nextStageId })}>すすむ <kbd>N</kbd></button></div>}
      <div className="result-actions">
        <button className="secondary-button shortcut-button" onClick={() => dispatch({ type: "SHOW_MAP" })}><strong><UiText>レッスン一覧へ</UiText></strong><small><kbd>M</kbd></small></button>
        <button className="secondary-button shortcut-button" onClick={() => dispatch({ type: "START_STAGE", stageId: state.result.stage.id })}><strong><UiText>もう1回</UiText></strong><small><kbd>R</kbd></small></button>
      </div>
    </div>
  </section>;
}

function ReleaseConfirmDialog({ state, dispatch }) {
  const fish = state.save.caughtFish.find((item) => item.id === state.releaseCandidateId);
  if (!fish) return null;
  const species = getFishSpecies(fish.speciesId);
  const sameSpeciesCount = state.save.caughtFish.filter((item) => item.speciesId === fish.speciesId).length;
  const multiple = sameSpeciesCount > 1;
  return <section className="release-confirm-overlay" role="alertdialog" aria-modal="true" aria-label="魚を海へ逃がす"><div className="release-confirm-card"><FishVisual caughtFish={fish} /><p className="eyebrow"><UiText>海へ逃がす</UiText></p><h2><UiText>{species.name}</UiText>を<br /><UiText>{multiple ? "1匹だけ海へ逃がす？" : "海へ逃がす？"}</UiText></h2><p><UiText>{multiple ? `水槽にいる ${sameSpeciesCount} 匹のうち、1匹だけ海へ帰すよ。` : "水槽からはいなくなるよ。"}</UiText><br /><UiText>図鑑の記録は残るよ。</UiText></p><div className="release-confirm-actions"><button className="secondary-button" onClick={() => dispatch({ type: "CANCEL_RELEASE" })}>キャンセル</button><button className="primary-button" onClick={() => dispatch({ type: "CONFIRM_RELEASE" })}><UiText>{multiple ? "1匹逃がす" : "海へ逃がす"}</UiText></button></div></div></section>;
}
