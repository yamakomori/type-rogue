import { STAGES, getNextStage, getStage } from "./domain/curriculum.js";
import { chooseProblems } from "./domain/problems.js";
import { ITEMS, equip, getItem, purchase, rewardForPlay, rewardForProblem } from "./domain/economy.js";
import { stageAccuracy, updateSkills } from "./domain/learning.js";
import { loadSave, persistSave, resetSave } from "./domain/save.js";
import { completedAttempt, startAttempt, submitKey } from "./domain/session.js";
import { getFingerGuide } from "./domain/fingers.js";

const appRoot = document.getElementById("app");

class TypeRogueApp {
  constructor(root) {
    this.root = root;
    this.save = loadSave();
    this.screen = "map";
    this.session = null;
    this.result = null;
    this.message = "";
    this.autoAdvanceTimer = null;
    this.bindEvents();
    this.render();
  }

  bindEvents() {
    this.root.addEventListener("click", (event) => {
      const target = event.target.closest("[data-action]");
      if (!target) return;
      this.handleAction(target.dataset.action, target.dataset.value);
    });
    window.addEventListener("keydown", (event) => this.handleKey(event));
  }

  saveNow() {
    persistSave(this.save);
  }

  handleAction(action, value) {
    if (action === "start-stage") this.startStage(value);
    if (action === "show-map") { this.clearAutoAdvance(); this.session = null; this.screen = "map"; this.message = ""; this.render(); }
    if (action === "show-wardrobe") { this.screen = "wardrobe"; this.message = ""; this.render(); }
    if (action === "show-settings") { this.screen = "settings"; this.message = ""; this.render(); }
    if (action === "buy-or-equip") this.buyOrEquip(value);
    if (action === "toggle-guide") {
      this.save = { ...this.save, settings: { ...this.save.settings, keyboardGuide: !this.save.settings.keyboardGuide } };
      this.saveNow(); this.render();
    }
    if (action === "toggle-motion") {
      this.save = { ...this.save, settings: { ...this.save.settings, reducedMotion: !this.save.settings.reducedMotion } };
      this.saveNow(); this.render();
    }
    if (action === "reset-save") {
      if (window.confirm("冒険のきろくを最初からにしますか？")) {
        this.save = resetSave(); this.screen = "map"; this.session = null; this.result = null; this.render();
      }
    }
  }

  startStage(stageId) {
    this.clearAutoAdvance();
    if (!this.save.unlockedStageIds.includes(stageId)) return;
    const stage = getStage(stageId);
    const problems = chooseProblems({
      stageId,
      skills: this.save.skills,
      recentIds: this.save.recentProblemIds,
      count: 3,
    });
    this.session = {
      stage,
      problems,
      index: 0,
      attempt: startAttempt(problems[0]),
      earned: { coins: 0, xp: 0 },
      completedAttempts: [],
      feedback: "",
    };
    this.screen = "typing";
    this.message = "";
    this.render();
  }

  handleKey(event) {
    if (event.ctrlKey || event.metaKey || event.altKey || event.isComposing) return;
    if (this.screen === "result") {
      if (event.key.toLowerCase() === "m") {
        event.preventDefault();
        this.screen = "map";
        this.render();
      }
      if (event.key.toLowerCase() === "r") {
        event.preventDefault();
        this.startStage(this.save.currentStageId);
      }
      return;
    }
    if (this.screen !== "typing" || !this.session) return;
    if (this.session.attempt.completed) return;
    const ignored = ["Shift", "Control", "Alt", "Meta", "CapsLock", "Tab", "Enter", "Escape"];
    if (ignored.includes(event.key) || event.key.length !== 1) return;
    event.preventDefault();
    const key = event.key.toLowerCase();
    const { attempt, result } = submitKey(this.session.attempt, key);
    this.session.attempt = attempt;
    this.session.feedback = result.accepted ? "" : "だいじょうぶ。つぎの ひかりを さがそう。";
    if (result.completed) this.completeProblem(result.durationMs);
    this.render();
  }

  completeProblem(durationMs) {
    const finished = completedAttempt(this.session.attempt, durationMs);
    const reward = rewardForProblem();
    this.session.completedAttempts.push(finished);
    this.session.earned.coins += reward.coins;
    this.session.earned.xp += reward.xp;
    this.save = {
      ...this.save,
      coins: this.save.coins + reward.coins,
      xp: this.save.xp + reward.xp,
      skills: updateSkills(this.save.skills, finished),
      completedProblemIds: [...new Set([...this.save.completedProblemIds, finished.problemId])],
      recentProblemIds: [...this.save.recentProblemIds, finished.problemId].slice(-10),
    };
    this.saveNow();
    this.session.feedback = "みつけた！ 小さなひかりが ふえたよ。";
    this.scheduleAutoAdvance();
  }

  scheduleAutoAdvance() {
    this.clearAutoAdvance();
    this.autoAdvanceTimer = window.setTimeout(() => {
      if (!this.session?.attempt.completed) return;
      if (this.session.index + 1 === this.session.problems.length) this.finishPlay();
      else this.nextProblem();
    }, 650);
  }

  clearAutoAdvance() {
    if (this.autoAdvanceTimer !== null) window.clearTimeout(this.autoAdvanceTimer);
    this.autoAdvanceTimer = null;
  }

  nextProblem() {
    this.clearAutoAdvance();
    this.session.index += 1;
    if (this.session.index >= this.session.problems.length) {
      this.finishPlay();
      return;
    }
    this.session.attempt = startAttempt(this.session.problems[this.session.index]);
    this.session.feedback = "";
    this.render();
  }

  finishPlay() {
    if (!this.session) return;
    this.clearAutoAdvance();
    const stageId = this.session.stage.id;
    const bonus = rewardForPlay();
    const playCount = (this.save.stagePlayCounts[stageId] ?? 0) + 1;
    let unlockedStageId = null;
    const nextStage = getNextStage(stageId);
    const allAttempts = [...this.save.attempts, ...this.session.completedAttempts];
    if (nextStage && playCount >= this.session.stage.minCompletedPlays && !this.save.unlockedStageIds.includes(nextStage.id)) {
      unlockedStageId = nextStage.id;
    }
    this.save = {
      ...this.save,
      coins: this.save.coins + bonus.coins,
      xp: this.save.xp + bonus.xp,
      attempts: allAttempts.slice(-300),
      stagePlayCounts: { ...this.save.stagePlayCounts, [stageId]: playCount },
      unlockedStageIds: unlockedStageId ? [...this.save.unlockedStageIds, unlockedStageId] : this.save.unlockedStageIds,
      currentStageId: unlockedStageId ?? stageId,
    };
    this.saveNow();
    this.result = {
      stage: this.session.stage,
      earned: { coins: this.session.earned.coins + bonus.coins, xp: this.session.earned.xp + bonus.xp },
      unlockedStageId,
      accuracy: stageAccuracy(allAttempts, stageId),
    };
    this.session = null;
    this.screen = "result";
    this.render();
  }

  buyOrEquip(itemId) {
    const item = getItem(itemId);
    if (!item) return;
    if (this.save.ownedItemIds.includes(itemId)) {
      this.save = equip(this.save, itemId);
      this.message = `${item.name}を つけたよ。`;
    } else {
      const outcome = purchase(this.save, itemId);
      if (outcome.ok) { this.save = outcome.save; this.message = `${item.name}を みつけたよ。`; }
      else this.message = outcome.reason;
    }
    this.saveNow();
    this.render();
  }

  avatarMarkup() {
    const body = getItem(this.save.equipped.bodyColor);
    const head = getItem(this.save.equipped.head);
    const outfit = getItem(this.save.equipped.outfit);
    const headMark = head?.kind === "leaf" ? "◆" : head?.kind === "star" ? "★" : "";
    return `<div class="avatar" aria-label="あなたの相棒">
      <div class="avatar-headmark">${headMark}</div>
      <div class="avatar-head" style="background:${body?.color ?? "#88a97a"}"></div>
      <div class="avatar-body" style="background:${outfit?.color ?? "#ece3cc"}"></div>
      <span class="avatar-eye left"></span><span class="avatar-eye right"></span>
    </div>`;
  }

  headerMarkup() {
    return `<header class="topbar">
      <button class="brand" data-action="show-map" aria-label="地図へ">ことばの小さな冒険</button>
      <div class="topbar-actions">
        <span class="coin" aria-label="コイン ${this.save.coins}">◌ ${this.save.coins}</span>
        <button class="icon-button" data-action="show-wardrobe" aria-label="着せ替え">♧</button>
        <button class="icon-button" data-action="show-settings" aria-label="設定">⚙</button>
      </div>
    </header>`;
  }

  mapMarkup() {
    const cards = STAGES.map((stage, index) => {
      const unlocked = this.save.unlockedStageIds.includes(stage.id);
      const current = this.save.currentStageId === stage.id;
      const plays = this.save.stagePlayCounts[stage.id] ?? 0;
      return `<article class="stage-card ${unlocked ? "" : "locked"} ${current ? "current" : ""}">
        <span class="stage-number">${String(index + 1).padStart(2, "0")}</span>
        <div><h2>${unlocked ? stage.name : "まだ とおれない みち"}</h2>
        <p>${unlocked ? stage.description : "ひとつ前の道を あるくと、ひらくよ。"}</p>
        ${unlocked ? `<small>${plays} 回あるいた</small>` : ""}</div>
        <button class="secondary-button" data-action="start-stage" data-value="${stage.id}" ${unlocked ? "" : "disabled"}>${current ? "つづきへ" : "あるく"}</button>
      </article>`;
    }).join("");
    return `<section class="map-screen">
      <div class="map-hero"><div><p class="eyebrow">はじまりの庭</p><h1>今日は、どの灯りへ行く？</h1><p>1回は、3つの小さな問題だけ。</p></div>${this.avatarMarkup()}</div>
      <div class="path-line" aria-hidden="true"></div>
      <div class="stage-list">${cards}</div>
    </section>`;
  }

  typingMarkup() {
    const { stage, index, problems, attempt, feedback } = this.session;
    const display = attempt.matcher.display();
    const progress = `${index + 1} / ${problems.length}`;
    const input = `<span class="typed">${display.typed || " "}</span><span class="next">${display.next || ""}</span><span class="rest">${display.rest || ""}</span>`;
    const finger = getFingerGuide(display.next);
    const done = attempt.completed;
    const companionText = done
      ? "できた！ スペースか Enter で、つぎへ行こう。"
      : feedback || (finger.label ? `${finger.label}で ${display.next.toUpperCase() === " " ? "Space" : display.next.toUpperCase()} を おそう。` : "つぎのキーを、ゆっくりさがそう。");
    const keyboard = this.save.settings.keyboardGuide ? this.keyboardMarkup(display.next, finger, companionText) : "";
    return `<section class="typing-screen ${this.save.settings.reducedMotion ? "reduce-motion" : ""}">
      <div class="typing-top"><button class="text-button" data-action="show-map">← 地図へ</button><span>灯り ${progress}</span></div>
      <div class="typing-stage"><p class="eyebrow">${stage.name}</p>
        <p class="problem-title">${attempt.problem.title}</p>
        <p class="problem-text" aria-label="入力する文字">${attempt.problem.text}</p>
        <p class="input-guide" aria-label="ローマ字入力">${input}</p>
        ${done ? `<p class="clear-message">灯りが つぎの道を 照らしている…</p>` : ""}
      </div>
      ${keyboard}
    </section>`;
  }

  keyboardMarkup(expected, finger, companionText) {
    const rows = [["q", "w", "e", "r", "t", "y", "u", "i", "o", "p"], ["a", "s", "d", "f", "g", "h", "j", "k", "l"], ["z", "x", "c", "v", "b", "n", "m"]];
    return `<div class="keyboard-area"><aside class="guide-companion" aria-live="polite">${this.avatarMarkup()}<p class="speech-bubble">${this.escape(companionText)}</p></aside><div class="keyboard-guide" aria-label="キーボードガイド">${rows.map((row) => `<div class="key-row">${row.map((key) => `<span class="keycap ${expected === key ? "expected" : ""}">${key.toUpperCase()}</span>`).join("")}</div>`).join("")}<div class="key-row"><span class="keycap space ${expected === " " ? "expected" : ""}">SPACE</span></div><div class="finger-guide" aria-label="使う指のガイド">${this.handMarkup("left", finger)}${this.handMarkup("right", finger)}</div></div></div>`;
  }

  handMarkup(side, active) {
    const handName = side === "left" ? "左手" : "右手";
    const fingers = ["pinky", "ring", "middle", "index", "thumb"];
    return `<div class="hand-group"><span class="hand-label">${handName}</span><div class="hand ${side}" aria-label="${handName}の指"><span class="palm"></span>${fingers.map((id) => `<span class="finger ${id} ${active.finger === id && (active.side === side || active.side === "both") ? "active" : ""}"></span>`).join("")}</div></div>`;
  }

  escape(text) {
    return text.replace(/[&<>"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[char]);
  }

  resultMarkup() {
    const nextName = this.result.unlockedStageId ? getStage(this.result.unlockedStageId).name : null;
    return `${this.mapMarkup()}<section class="reward-overlay" role="dialog" aria-modal="true" aria-label="見つけたもの">
      <div class="reward-card"><div class="result-glow">✦</div>${this.avatarMarkup()}
        <p class="eyebrow">小さな発見</p><h1>コインを ${this.result.earned.coins} こ<br>みつけた！</h1>
        <div class="found-item"><span>◌</span><strong>ひかりのコイン</strong><small>+${this.result.earned.coins}</small></div>
        <p>${this.result.accuracy >= 0.85 ? "ゆっくり、ていねいに歩けたね。" : "最後まで あるけたね。すてき！"}</p>
        ${nextName ? `<div class="unlock-note">あたらしい道<br><strong>${nextName}</strong> が ひらいたよ。</div>` : ""}
        <div class="result-actions"><button class="secondary-button shortcut-button" data-action="show-map"><strong>地図へ</strong><small><kbd>M</kbd></small></button><button class="primary-button shortcut-button" data-action="start-stage" data-value="${this.save.currentStageId}"><strong>もう1回</strong><small><kbd>R</kbd></small></button></div>
      </div>
    </section>`;
  }

  wardrobeMarkup() {
    const cards = ITEMS.map((item) => {
      const owned = this.save.ownedItemIds.includes(item.id);
      const equipped = this.save.equipped[item.slot] === item.id;
      const style = item.color ? `style="--item-color:${item.color}"` : "";
      const visual = item.kind === "leaf" ? "◆" : item.kind === "star" ? "★" : "●";
      const label = equipped ? "つけている" : owned ? "つける" : `${item.price} コインで みつける`;
      return `<article class="item-card ${equipped ? "equipped" : ""}"><div class="item-preview" ${style}>${visual}</div><h2>${item.name}</h2><p>${item.slot === "bodyColor" ? "からだの色" : item.slot === "head" ? "あたま" : "ふく"}</p><button class="secondary-button" data-action="buy-or-equip" data-value="${item.id}" ${equipped ? "disabled" : ""}>${label}</button></article>`;
    }).join("");
    return `<section class="wardrobe-screen"><div class="screen-heading"><div><p class="eyebrow">相棒のもちもの</p><h1>今日は、なにを身につける？</h1><p>${this.message || "問題を終えると、コインが見つかるよ。"}</p></div>${this.avatarMarkup()}</div><div class="item-grid">${cards}</div><button class="text-button back-button" data-action="show-map">← 地図へもどる</button></section>`;
  }

  settingsMarkup() {
    return `<section class="settings-screen"><p class="eyebrow">設定</p><h1>遊びやすくする</h1><div class="settings-list">
      <button class="setting-row" data-action="toggle-guide"><span>キーボードガイド</span><strong>${this.save.settings.keyboardGuide ? "表示中" : "非表示"}</strong></button>
      <button class="setting-row" data-action="toggle-motion"><span>動きをひかえめにする</span><strong>${this.save.settings.reducedMotion ? "オン" : "オフ"}</strong></button>
    </div><button class="danger-button" data-action="reset-save">冒険のきろくを最初からにする</button><button class="text-button back-button" data-action="show-map">← 地図へもどる</button></section>`;
  }

  render() {
    const content = this.screen === "typing" ? this.typingMarkup()
      : this.screen === "result" ? this.resultMarkup()
        : this.screen === "wardrobe" ? this.wardrobeMarkup()
          : this.screen === "settings" ? this.settingsMarkup() : this.mapMarkup();
    this.root.innerHTML = `${this.headerMarkup()}${content}`;
  }
}

new TypeRogueApp(appRoot);
