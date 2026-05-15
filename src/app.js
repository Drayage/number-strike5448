(function initApp() {
  const {
    SHOP_ITEMS,
    calculateReward,
    countDuplicateKinds,
    generateCode,
    getRoundConfig,
    judgeGuess,
    pickAbsentDigits,
    pickUnlockedPosition,
    validateGuess,
  } = window.NumberChallengeCore;

  const SAVE_KEY = "number-challenge-save";

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
    },
    phase: "playing",
    secret: [],
    eliminated: [],
    locked: [],
    history: [],
    lastReward: null,
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
    eliminatorCount: $("#eliminatorCount"),
    lockerCount: $("#lockerCount"),
    eliminatedDigits: $("#eliminatedDigits"),
    lockedDigits: $("#lockedDigits"),
    duplicateIntel: $("#duplicateIntel"),
    overlay: $("#overlay"),
    overlayEyebrow: $("#overlayEyebrow"),
    overlayTitle: $("#overlayTitle"),
    overlayBody: $("#overlayBody"),
    overlayButton: $("#overlayButton"),
  };

  function loadState() {
    try {
      const saved = JSON.parse(localStorage.getItem(SAVE_KEY));
      if (!saved || !Array.isArray(saved.secret) || saved.secret.length === 0) {
        return null;
      }
      return saved;
    } catch {
      return null;
    }
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
    elements.useEliminatorButton.disabled = state.inventory.eliminator <= 0 || isShop || isGameOver;
    elements.useLockerButton.disabled = state.inventory.locker <= 0 || isShop || isGameOver;
    elements.eliminatedDigits.textContent = state.eliminated.length ? state.eliminated.join(", ") : "없음";
    elements.lockedDigits.textContent = state.locked.length
      ? state.locked
          .slice()
          .sort((a, b) => a.index - b.index)
          .map((entry) => `${entry.index + 1}번째=${entry.digit}`)
          .join(", ")
      : "없음";
    elements.duplicateIntel.textContent = getDuplicateIntel(config);

    renderCodeSlots(config);
    renderHistory();
    renderShopButtons();
    renderReward();
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
        <small>${entry.solved ? "Clear" : "HP -1"}</small>
      `;
      elements.historyList.append(item);
    });
  }

  function renderShopButtons() {
    document.querySelectorAll("[data-shop-item]").forEach((button) => {
      const key = button.dataset.shopItem;
      const item = SHOP_ITEMS[key];
      const soldOut = key === "magnifier" && state.inventory.magnifier;
      button.disabled = state.gold < item.price || soldOut;
      button.classList.toggle("sold-out", soldOut);
    });
  }

  function renderReward() {
    if (!state.lastReward) {
      elements.rewardSummary.textContent = "";
      return;
    }
    const reward = state.lastReward;
    elements.rewardSummary.textContent = `${reward.bonusLabel}: 기본 ${reward.base} Gold × ${reward.multiplier} = ${reward.total} Gold 획득`;
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
    state.history.push({ guess: guessValue, ...result });
    elements.guessInput.value = "";

    if (result.solved) {
      completeRound();
      return;
    }

    state.hp -= 1;
    if (state.hp <= 0) {
      endRun();
      return;
    }

    setHint(`${result.strikes} Strike, ${result.balls} Ball. 오답으로 HP가 1 감소했습니다.`, "danger");
    render();
  }

  function completeRound() {
    const reward = calculateReward(state.round, state.attempts);
    state.gold += reward.total;
    state.lastReward = reward;
    state.phase = "shop";
    setHint("정답입니다. 상점에서 다음 라운드를 준비하세요.", "success");
    render();
  }

  function endRun() {
    state.hp = 0;
    state.phase = "gameOver";
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
    state.phase = "playing";
    state.attempts = 0;
    state.secret = generateCode(getRoundConfig(nextRound));
    state.eliminated = [];
    state.locked = [];
    state.history = [];
    state.lastReward = null;
    setHint("새 코드가 생성되었습니다.", "normal");

    if (nextRound === 16) {
      showOverlay("Infinite", "무한 모드 진입", "정규 15라운드를 클리어했습니다. 이제부터는 기록에 도전합니다.");
    }

    render();
    elements.guessInput.focus();
  }

  function buyItem(key) {
    const item = SHOP_ITEMS[key];
    if (!item || state.gold < item.price) {
      return;
    }

    if (key === "magnifier" && state.inventory.magnifier) {
      return;
    }

    state.gold -= item.price;

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

    const picked = pickAbsentDigits(state.secret, state.eliminated);
    if (picked.length === 0) {
      setHint("더 이상 제외할 수 있는 숫자가 없습니다.", "warn");
      return;
    }

    state.inventory.eliminator -= 1;
    state.eliminated.push(...picked);
    setHint(`정답에 없는 숫자 ${picked.join(", ")} 제외.`, "success");
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
      elements.guessInput.focus();
      return;
    }

    if (value === "enter") {
      elements.guessForm.requestSubmit();
      return;
    }

    if (/^\d$/.test(value) && elements.guessInput.value.length < config.digits) {
      elements.guessInput.value += value;
      elements.guessInput.focus();
    }
  }

  elements.guessForm.addEventListener("submit", submitGuess);
  elements.nextRoundButton.addEventListener("click", startNextRound);
  elements.newRunButton.addEventListener("click", newRun);
  elements.overlayButton.addEventListener("click", newRun);
  elements.useEliminatorButton.addEventListener("click", useEliminator);
  elements.useLockerButton.addEventListener("click", useLocker);
  document.querySelectorAll("[data-shop-item]").forEach((button) => {
    button.addEventListener("click", () => buyItem(button.dataset.shopItem));
  });
  document.querySelectorAll("[data-keypad]").forEach((button) => {
    button.addEventListener("click", () => handleKeypad(button.dataset.keypad));
  });

  ensureRound();
  render();
})();
