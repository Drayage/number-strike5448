(function initApp() {
  const {
    SHOP_ITEMS,
    calculateInterest,
    calculateReward,
    countDuplicateKinds,
    compareGuessDirection,
    generateCode,
    getRoundConfig,
    judgeGuess,
    pickAbsentDigits,
    pickUnscannedParity,
    pickUnlockedPosition,
    validateGuess,
  } = window.NumberChallengeCore;

  const SAVE_KEY = "number-challenge-save";
  const RECORD_KEY = "number-challenge-records";

  function loadRecords() {
    try {
      return JSON.parse(localStorage.getItem(RECORD_KEY)) ?? { bestRound: 0 };
    } catch {
      return { bestRound: 0 };
    }
  }

  let records = loadRecords();

  function updateBestRound(round) {
    if (round > records.bestRound) {
      records.bestRound = round;
      localStorage.setItem(RECORD_KEY, JSON.stringify(records));
    }
  }

  const initialState = () => ({
    round: 1,
    hp: 10,
    maxHp: 10,
    gold: 0,
    attempts: 0,
    inventory: {
      eliminator: 0,
      locker: 0,
      magnifier: false,
      retry: 0,
      parityScanner: 0,
      compass: 0,
      updown: 0,
    },
    phase: "playing",
    secret: [],
    eliminated: [],
    locked: [],
    parityIntel: [],
    updownIntel: "없음",
    history: [],
    lastReward: null,
    shopBought: {},
  });

  let state = loadState() ?? initialState();

  const $ = (selector) => document.querySelector(selector);
  const elements = {
    roundLabel: $("#roundLabel"),
    hpLabel: $("#hpLabel"),
    goldLabel: $("#goldLabel"),
    attemptLabel: $("#attemptLabel"),
    phaseLabel: $("#phaseLabel"),
    codeSlots: $("#codeSlots"),
    digitsLabel: $("#digitsLabel"),
    duplicateLabel: $("#duplicateLabel"),
    modeLabel: $("#modeLabel"),
    guessForm: $("#guessForm"),
    guessInput: $("#guessInput"),
    inputHint: $("#inputHint"),
    historyList: $("#historyList"),
    shopPanel: $("#shopPanel"),
    rewardSummary: $("#rewardSummary"),
    nextRoundButton: $("#nextRoundButton"),
    newRunButton: $("#newRunButton"),
    useEliminatorButton: $("#useEliminatorButton"),
    useLockerButton: $("#useLockerButton"),
    useScannerButton: $("#useScannerButton"),
    useUpdownButton: $("#useUpdownButton"),
    eliminatorCount: $("#eliminatorCount"),
    lockerCount: $("#lockerCount"),
    scannerCount: $("#scannerCount"),
    updownCount: $("#updownCount"),
    eliminatedDigits: $("#eliminatedDigits"),
    lockedDigits: $("#lockedDigits"),
    parityIntel: $("#parityIntel"),
    duplicateIntel: $("#duplicateIntel"),
    compassIntel: $("#compassIntel"),
    updownIntel: $("#updownIntel"),
    retryIntel: $("#retryIntel"),
    overlay: $("#overlay"),
    overlayEyebrow: $("#overlayEyebrow"),
    overlayTitle: $("#overlayTitle"),
    overlayBody: $("#overlayBody"),
    overlayButton: $("#overlayButton"),
    bestRoundLabel: $("#bestRoundLabel"),
  };

  function loadState() {
    try {
      const saved = JSON.parse(localStorage.getItem(SAVE_KEY));
      if (!saved || !Array.isArray(saved.secret) || saved.secret.length === 0) {
        return null;
      }
      return normalizeState(saved);
    } catch {
      return null;
    }
  }

  function normalizeState(saved) {
    const fresh = initialState();
    return {
      ...fresh,
      ...saved,
      inventory: { ...fresh.inventory, ...(saved.inventory ?? {}) },
      eliminated: saved.eliminated ?? [],
      locked: saved.locked ?? [],
      parityIntel: saved.parityIntel ?? [],
      updownIntel: saved.updownIntel ?? "없음",
      history: saved.history ?? [],
      shopBought: saved.shopBought ?? {},
    };
  }

  function saveState() {
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
  }

  function clearSave() {
    localStorage.removeItem(SAVE_KEY);
  }

  function ensureRound() {
    if (state.secret.length === 0) {
      state.secret = generateCode(getRoundConfig(state.round));
    }
  }

  function render() {
    const config = getRoundConfig(state.round);
    const isShop = state.phase === "shop";
    const isGameOver = state.phase === "gameOver";

    elements.roundLabel.textContent = state.round;
    elements.hpLabel.textContent = `${state.hp} / ${state.maxHp}`;
    elements.goldLabel.textContent = state.gold;
    elements.attemptLabel.textContent = state.attempts;
    elements.phaseLabel.textContent = `${config.phase} · ${config.feature}`;
    elements.digitsLabel.textContent = `${config.digits}자리`;
    elements.duplicateLabel.textContent = config.allowDuplicate ? "중복 가능" : "중복 불가";
    elements.modeLabel.textContent = config.mode;
    elements.guessInput.maxLength = config.digits;
    elements.guessInput.placeholder = `${config.digits}자리 숫자`;
    elements.guessInput.disabled = isShop || isGameOver;
    elements.guessForm.querySelector("button").disabled = isShop || isGameOver;
    elements.shopPanel.hidden = !isShop;
    elements.eliminatorCount.textContent = state.inventory.eliminator;
    elements.lockerCount.textContent = state.inventory.locker;
    elements.scannerCount.textContent = state.inventory.parityScanner;
    elements.updownCount.textContent = state.inventory.updown;
    elements.useEliminatorButton.disabled = state.inventory.eliminator <= 0 || isShop || isGameOver;
    elements.useLockerButton.disabled = state.inventory.locker <= 0 || isShop || isGameOver;
    elements.useScannerButton.disabled = state.inventory.parityScanner <= 0 || isShop || isGameOver;
    elements.useUpdownButton.disabled = state.inventory.updown <= 0 || isShop || isGameOver;
    elements.eliminatedDigits.textContent = state.eliminated.length ? state.eliminated.join(", ") : "없음";
    elements.lockedDigits.textContent = state.locked.length
      ? state.locked
          .slice()
          .sort((a, b) => a.index - b.index)
          .map((entry) => `${entry.index + 1}번째=${entry.digit}`)
          .join(", ")
      : "없음";
    elements.parityIntel.textContent = state.parityIntel.length
      ? state.parityIntel
          .slice()
          .sort((a, b) => a.index - b.index)
          .map((entry) => `${entry.index + 1}번째=${entry.parity}`)
          .join(", ")
      : "없음";
    elements.duplicateIntel.textContent = getDuplicateIntel(config);
    elements.compassIntel.textContent = state.inventory.compass > 0
      ? `보상 +${state.inventory.compass * 25}% (${state.inventory.compass}중첩)`
      : "없음";
    elements.updownIntel.textContent = state.updownIntel;
    elements.retryIntel.textContent = state.inventory.retry > 0 ? `피해 무효 ${state.inventory.retry}회` : "없음";
    elements.bestRoundLabel.textContent = records.bestRound > 0 ? `${records.bestRound}라운드` : "—";

    renderCodeSlots(config);
    renderHistory();
    renderShopButtons();
    renderReward();
    renderKeypad();
    syncInputLock();
    saveState();
  }

  function renderCodeSlots(config) {
    elements.codeSlots.innerHTML = "";
    elements.codeSlots.style.setProperty("--slot-count", Math.min(config.digits, 12));

    for (let index = 0; index < config.digits; index += 1) {
      const slot = document.createElement("div");
      const locked = state.locked.find((entry) => entry.index === index);
      slot.className = locked ? "code-slot revealed" : "code-slot";
      slot.textContent = locked ? locked.digit : "?";
      elements.codeSlots.append(slot);
    }
  }

  function renderHistory() {
    elements.historyList.innerHTML = "";
    const entries = state.history.slice(-10).reverse();

    if (entries.length === 0) {
      const empty = document.createElement("li");
      empty.className = "empty-log";
      empty.textContent = "아직 기록이 없습니다.";
      elements.historyList.append(empty);
      return;
    }

    entries.forEach((entry) => {
      const item = document.createElement("li");
      item.className = entry.solved ? "history-item solved" : "history-item";
      item.innerHTML = `
        <span>${entry.guess}</span>
        <strong>${entry.strikes}S ${entry.balls}B</strong>
        <small>${getHistoryNote(entry)}</small>
      `;
      elements.historyList.append(item);
    });
  }

  function getHistoryNote(entry) {
    if (entry.solved) {
      return "Clear";
    }
    if (entry.protected) {
      return "무효";
    }
    return "HP -1";
  }

  function getItemPrice(key) {
    const base = SHOP_ITEMS[key].price;
    const count = typeof state.inventory[key] === "number" ? state.inventory[key] : 0;
    return count > 0 ? Math.round(base * Math.pow(1.4, count)) : base;
  }

  function renderShopButtons() {
    document.querySelectorAll("[data-shop-item]").forEach((button) => {
      const key = button.dataset.shopItem;
      const price = getItemPrice(key);
      const soldOut = key === "magnifier" && state.inventory.magnifier;
      const shopMaxed = (state.shopBought[key] ?? 0) >= 2;

      button.disabled = state.gold < price || soldOut || shopMaxed;
      button.classList.toggle("sold-out", soldOut);
      button.classList.toggle("shop-maxed", shopMaxed);

      const priceEl = button.querySelector("strong");
      if (priceEl) priceEl.textContent = shopMaxed ? "이번 구매 완료" : `${price} Gold`;
    });
  }

  function renderReward() {
    if (!state.lastReward) {
      elements.rewardSummary.textContent = "";
      return;
    }
    const reward = state.lastReward;
    const parts = [`기본 ${reward.base} Gold × ${reward.multiplier}`];
    if (reward.compassBonus > 0) parts.push(`나침반 +${reward.compassBonus}`);
    if (reward.interest > 0) parts.push(`이자 +${reward.interest}`);
    const grandTotal = reward.total + (reward.interest ?? 0);
    elements.rewardSummary.textContent = `${reward.bonusLabel}: ${parts.join(" · ")} = ${grandTotal} Gold 획득 · HP +${reward.heal}`;
  }

  function getDuplicateIntel(config) {
    if (!state.inventory.magnifier) {
      return "미보유";
    }
    if (!config.allowDuplicate) {
      return "이번 라운드 중복 없음";
    }
    return `중복 숫자 ${countDuplicateKinds(state.secret)}종`;
  }

  function setHint(message, tone = "normal") {
    elements.inputHint.textContent = message;
    elements.inputHint.dataset.tone = tone;
  }

  function submitGuess(event) {
    event.preventDefault();
    const config = getRoundConfig(state.round);
    const guessValue = elements.guessInput.value.trim();
    const error = validateGuess(guessValue, config);

    if (error) {
      setHint(error, "warn");
      return;
    }

    const result = judgeGuess(state.secret, [...guessValue]);
    state.attempts += 1;
    elements.guessInput.value = "";

    if (result.solved) {
      state.history.push({ guess: guessValue, ...result });
      completeRound();
      return;
    }

    const protectedByRetry = state.inventory.retry > 0;
    if (protectedByRetry) {
      state.inventory.retry -= 1;
    } else {
      state.hp -= 1;
    }
    state.history.push({ guess: guessValue, ...result, protected: protectedByRetry });
    if (state.hp <= 0) {
      endRun();
      return;
    }

    let round1DirText = "";
    if (state.round === 1) {
      const dir = compareGuessDirection(state.secret, [...guessValue]);
      state.updownIntel = `${guessValue}: ${dir}`;
      round1DirText = dir === "UP" ? " 정답이 더 큽니다." : " 정답이 더 작습니다.";
    }

    setHint(
      `${result.strikes} Strike, ${result.balls} Ball.${round1DirText} ${
        protectedByRetry ? "재판정권으로 피해를 막았습니다." : "오답으로 HP가 1 감소했습니다."
      }`,
      protectedByRetry ? "warn" : "danger",
    );
    render();
  }

  function completeRound() {
    const interest = calculateInterest(state.gold);
    const reward = calculateReward(state.round, state.attempts, state.inventory.compass);
    const heal = reward.bonusLabel === "Perfect" ? 2 : 1;
    const beforeHp = state.hp;
    state.gold += reward.total + interest;
    state.hp = Math.min(state.maxHp, state.hp + heal);
    state.lastReward = { ...reward, heal: state.hp - beforeHp, interest };
    state.phase = "shop";
    state.shopBought = {};
    setHint(`정답입니다. HP가 ${state.hp - beforeHp} 회복되었습니다.`, "success");
    if (state.round === 15) triggerBossClearEffect();
    render();
    setTimeout(() => elements.shopPanel.scrollIntoView({ behavior: "smooth", block: "start" }), 60);
  }

  function endRun() {
    state.hp = 0;
    state.phase = "gameOver";
    updateBestRound(state.round);
    clearSave();
    showOverlay(
      "Game Over",
      "도전 종료",
      `${state.round}라운드에서 쓰러졌습니다. 마지막 정답은 ${state.secret.join("")}였습니다.`,
    );
    render();
  }

  function showOverlay(eyebrow, title, body) {
    elements.overlayEyebrow.textContent = eyebrow;
    elements.overlayTitle.textContent = title;
    elements.overlayBody.textContent = body;
    elements.overlay.hidden = false;
  }

  function hideOverlay() {
    elements.overlay.hidden = true;
  }

  function startNextRound() {
    const nextRound = state.round + 1;
    state.round = nextRound;
    updateBestRound(nextRound);
    state.phase = "playing";
    state.attempts = 0;
    state.secret = generateCode(getRoundConfig(nextRound));
    state.eliminated = [];
    state.locked = [];
    state.parityIntel = [];
    state.updownIntel = "없음";
    state.history = [];
    state.lastReward = null;
    setHint("새 코드가 생성되었습니다.", "normal");

    if (nextRound === 16) {
      showOverlay("Infinite", "무한 모드 진입", "정규 15라운드를 클리어했습니다. 이제부터는 기록에 도전합니다.");
    }

    render();
    elements.guessInput.focus();
    setTimeout(() => window.scrollTo({ top: 0, behavior: "smooth" }), 60);
  }

  function buyItem(key) {
    const item = SHOP_ITEMS[key];
    const price = getItemPrice(key);
    if (!item || state.gold < price) return;
    if (key === "magnifier" && state.inventory.magnifier) return;
    if ((state.shopBought[key] ?? 0) >= 2) return;

    state.gold -= price;
    state.shopBought[key] = (state.shopBought[key] ?? 0) + 1;

    if (key === "potion") {
      state.hp = Math.min(state.maxHp, state.hp + 2);
    } else if (key === "heart") {
      state.maxHp += 1;
      state.hp = Math.min(state.maxHp, state.hp + 1);
    } else if (key === "magnifier") {
      state.inventory.magnifier = true;
    } else {
      state.inventory[key] += 1;
    }

    setHint(`${item.name} 구매 완료.`, "success");
    render();
  }

  function useEliminator() {
    if (state.inventory.eliminator <= 0 || state.phase !== "playing") {
      return;
    }

    const picked = pickAbsentDigits(state.secret, []);
    if (picked.length === 0) {
      setHint("더 이상 제외할 수 있는 숫자가 없습니다.", "warn");
      return;
    }

    state.inventory.eliminator -= 1;
    const newOnes = picked.filter((d) => !state.eliminated.includes(d));
    state.eliminated.push(...newOnes);
    const suffix = newOnes.length < picked.length ? " (일부 재확인)" : "";
    setHint(`정답에 없는 숫자 ${picked.join(", ")} 제외.${suffix}`, "success");
    render();
  }

  function useLocker() {
    if (state.inventory.locker <= 0 || state.phase !== "playing") {
      return;
    }

    const locked = pickUnlockedPosition(state.secret, state.locked);
    if (!locked) {
      setHint("모든 위치가 이미 공개되었습니다.", "warn");
      return;
    }

    state.inventory.locker -= 1;
    state.locked.push(locked);
    setHint(`${locked.index + 1}번째 자리는 ${locked.digit}입니다.`, "success");
    render();
  }

  function useScanner() {
    if (state.inventory.parityScanner <= 0 || state.phase !== "playing") {
      return;
    }

    const scanned = pickUnscannedParity(state.secret, state.parityIntel);
    if (!scanned) {
      setHint("모든 자리의 홀짝 정보가 이미 공개되었습니다.", "warn");
      return;
    }

    state.inventory.parityScanner -= 1;
    state.parityIntel.push(scanned);
    setHint(`${scanned.index + 1}번째 자리는 ${scanned.parity}입니다.`, "success");
    render();
  }

  function useUpdown() {
    if (state.inventory.updown <= 0 || state.phase !== "playing") {
      return;
    }

    const config = getRoundConfig(state.round);
    const guessValue = elements.guessInput.value.trim();
    const error = validateGuess(guessValue, config);
    if (error) {
      setHint(`업다운 확인: ${error}`, "warn");
      return;
    }

    const direction = compareGuessDirection(state.secret, [...guessValue]);
    const directionText =
      direction === "UP" ? "정답이 더 큽니다" : direction === "DOWN" ? "정답이 더 작습니다" : "정답과 같습니다";
    state.inventory.updown -= 1;
    state.updownIntel = `${guessValue}: ${direction}`;
    setHint(`업다운 확인 결과: ${directionText}.`, "success");
    render();
  }

  function newRun() {
    state = initialState();
    state.secret = generateCode(getRoundConfig(1));
    clearSave();
    hideOverlay();
    setHint("새 도전을 시작했습니다.", "normal");
    render();
    elements.guessInput.focus();
  }

  function handleKeypad(value) {
    const config = getRoundConfig(state.round);
    if (state.phase !== "playing") {
      return;
    }

    if (value === "back") {
      elements.guessInput.value = elements.guessInput.value.slice(0, -1);
      return;
    }

    if (value === "enter") {
      elements.guessForm.requestSubmit();
      return;
    }

    if (/^\d$/.test(value) && elements.guessInput.value.length < config.digits) {
      elements.guessInput.value += value;
    }
  }

  function triggerBossClearEffect() {
    const flash = document.createElement("div");
    flash.className = "boss-flash";
    document.body.appendChild(flash);
    setTimeout(() => flash.remove(), 900);

    const container = document.createElement("div");
    container.className = "boss-clear-fx";
    document.body.appendChild(container);

    const colors = ["#f2c14e", "#f2c14e", "#3fd0b4", "#ffffff", "#ef6262"];
    const count = 72;
    for (let i = 0; i < count; i++) {
      const p = document.createElement("div");
      p.className = "boss-particle";
      const angle = (i / count) * 360;
      const dist = 25 + Math.random() * 55;
      p.style.cssText = [
        `--tx:${(Math.sin((angle * Math.PI) / 180) * dist).toFixed(1)}vmin`,
        `--ty:${(-Math.cos((angle * Math.PI) / 180) * dist).toFixed(1)}vmin`,
        `--color:${colors[i % colors.length]}`,
        `--delay:${(Math.random() * 0.25).toFixed(2)}s`,
        `--size:${(3 + Math.random() * 7).toFixed(1)}px`,
      ].join(";");
      container.appendChild(p);
    }

    setTimeout(() => container.remove(), 2600);
  }

  function renderKeypad() {
    document.querySelectorAll("[data-keypad]").forEach((button) => {
      const val = button.dataset.keypad;
      if (/^\d$/.test(val)) {
        button.classList.toggle("eliminated", state.eliminated.includes(val));
      }
    });
  }

  function syncInputLock() {
    elements.guessInput.readOnly = window.matchMedia("(max-width: 560px)").matches;
  }

  elements.guessForm.addEventListener("submit", submitGuess);
  elements.nextRoundButton.addEventListener("click", startNextRound);
  elements.newRunButton.addEventListener("click", newRun);
  elements.overlayButton.addEventListener("click", newRun);
  elements.useEliminatorButton.addEventListener("click", useEliminator);
  elements.useLockerButton.addEventListener("click", useLocker);
  elements.useScannerButton.addEventListener("click", useScanner);
  elements.useUpdownButton.addEventListener("click", useUpdown);
  document.querySelectorAll("[data-shop-item]").forEach((button) => {
    button.addEventListener("click", () => buyItem(button.dataset.shopItem));
  });
  document.querySelectorAll("[data-keypad]").forEach((button) => {
    button.addEventListener("click", () => handleKeypad(button.dataset.keypad));
  });
  window.addEventListener("resize", syncInputLock);

  ensureRound();
  render();
})();
