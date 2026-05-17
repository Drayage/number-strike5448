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
    countDigitOccurrences,
    getMostRepeatedDigit,
    getMaxRepetitionCount,
    findAllPositions,
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
    gold: 50,
    attempts: 0,
    inventory: {
      eliminator: 0,
      locker: 0,
      magnifier: false,
      retry: 0,
      parityScanner: 0,
      compass: 0,
      updown: 0,
      counter: 0,
      duplicateDetector: false,
      signalDetector: 0,
      fullHeal: false,
      eyeOfTruth: 0,
      mouthOfTruth: 0,
      handOfTruth: 0,
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
    usedOnce: { fullHeal: false, eyeOfTruth: false, mouthOfTruth: false, handOfTruth: false },
    counterIntel: [],
    signalIntel: [],
    mouthOfTruthIntel: null,
    slotMemos: {},
    digitMemos: {},
  });

  // Non-persisted runtime state
  let digitPickMode = null;  // null | "counter" | "signalDetector" | "handOfTruth"
  let memoMode = false;
  let memoTargetSlot = null;
  let selectedLogIndices = [];  // up to 2 indices for log comparison
  let kidsMode = false;

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
    useCounterButton: $("#useCounterButton"),
    useSignalDetectorButton: $("#useSignalDetectorButton"),
    useEyeOfTruthButton: $("#useEyeOfTruthButton"),
    useMouthOfTruthButton: $("#useMouthOfTruthButton"),
    useHandOfTruthButton: $("#useHandOfTruthButton"),
    eliminatorCount: $("#eliminatorCount"),
    lockerCount: $("#lockerCount"),
    scannerCount: $("#scannerCount"),
    updownCount: $("#updownCount"),
    counterCount: $("#counterCount"),
    signalDetectorCount: $("#signalDetectorCount"),
    eyeOfTruthCount: $("#eyeOfTruthCount"),
    mouthOfTruthCount: $("#mouthOfTruthCount"),
    handOfTruthCount: $("#handOfTruthCount"),
    eliminatedDigits: $("#eliminatedDigits"),
    lockedDigits: $("#lockedDigits"),
    parityIntel: $("#parityIntel"),
    duplicateIntel: $("#duplicateIntel"),
    duplicateDetectorIntel: $("#duplicateDetectorIntel"),
    counterIntel: $("#counterIntel"),
    signalIntel: $("#signalIntel"),
    mouthOfTruthIntel: $("#mouthOfTruthIntel"),
    compassIntel: $("#compassIntel"),
    updownIntel: $("#updownIntel"),
    retryIntel: $("#retryIntel"),
    overlay: $("#overlay"),
    overlayEyebrow: $("#overlayEyebrow"),
    overlayTitle: $("#overlayTitle"),
    overlayBody: $("#overlayBody"),
    overlayButton: $("#overlayButton"),
    bestRoundLabel: $("#bestRoundLabel"),
    memoToggleButton: $("#memoToggleButton"),
    memoClearButton: $("#memoClearButton"),
    scrollToLogButton: $("#scrollToLogButton"),
    scrollToGameButton: $("#scrollToGameButton"),
    kidsModeButton: $("#kidsModeButton"),
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
      usedOnce: { ...fresh.usedOnce, ...(saved.usedOnce ?? {}) },
      counterIntel: saved.counterIntel ?? [],
      signalIntel: saved.signalIntel ?? [],
      mouthOfTruthIntel: saved.mouthOfTruthIntel ?? null,
      slotMemos: saved.slotMemos ?? {},
      digitMemos: saved.digitMemos ?? {},
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
    elements.counterCount.textContent = state.inventory.counter;
    elements.signalDetectorCount.textContent = state.inventory.signalDetector;
    elements.eyeOfTruthCount.textContent = state.inventory.eyeOfTruth;
    elements.mouthOfTruthCount.textContent = state.inventory.mouthOfTruth;
    elements.handOfTruthCount.textContent = state.inventory.handOfTruth;
    elements.useEliminatorButton.hidden = state.inventory.eliminator <= 0;
    elements.useLockerButton.hidden = state.inventory.locker <= 0;
    elements.useScannerButton.hidden = state.inventory.parityScanner <= 0;
    elements.useUpdownButton.hidden = state.inventory.updown <= 0;
    elements.useCounterButton.hidden = state.inventory.counter <= 0;
    elements.useSignalDetectorButton.hidden = state.inventory.signalDetector <= 0;
    elements.useEyeOfTruthButton.hidden = state.inventory.eyeOfTruth <= 0;
    elements.useMouthOfTruthButton.hidden = state.inventory.mouthOfTruth <= 0;
    elements.useHandOfTruthButton.hidden = state.inventory.handOfTruth <= 0;
    elements.useEliminatorButton.disabled = state.inventory.eliminator <= 0 || isShop || isGameOver;
    elements.useLockerButton.disabled = state.inventory.locker <= 0 || isShop || isGameOver;
    elements.useScannerButton.disabled = state.inventory.parityScanner <= 0 || isShop || isGameOver;
    elements.useUpdownButton.disabled = state.inventory.updown <= 0 || isShop || isGameOver;
    elements.useCounterButton.disabled = state.inventory.counter <= 0 || isShop || isGameOver;
    elements.useSignalDetectorButton.disabled = state.inventory.signalDetector <= 0 || isShop || isGameOver;
    elements.useEyeOfTruthButton.disabled = state.inventory.eyeOfTruth <= 0 || isShop || isGameOver;
    elements.useMouthOfTruthButton.disabled = state.inventory.mouthOfTruth <= 0 || isShop || isGameOver;
    elements.useHandOfTruthButton.disabled = state.inventory.handOfTruth <= 0 || isShop || isGameOver;
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

    // duplicateDetectorIntel
    if (elements.duplicateDetectorIntel) {
      if (state.inventory.duplicateDetector) {
        if (config.allowDuplicate) {
          elements.duplicateDetectorIntel.textContent = `최대 중복 ${getMaxRepetitionCount(state.secret)}개`;
        } else {
          elements.duplicateDetectorIntel.textContent = "이번 라운드 중복 없음";
        }
      } else {
        elements.duplicateDetectorIntel.textContent = "미보유";
      }
    }

    // counterIntel
    if (elements.counterIntel) {
      elements.counterIntel.textContent = state.counterIntel.length
        ? state.counterIntel.map((e) => `숫자 ${e.digit}: ${e.count}개`).join(", ")
        : "없음";
    }

    // signalIntel
    if (elements.signalIntel) {
      elements.signalIntel.textContent = state.signalIntel.length
        ? state.signalIntel.map((e) => `${e.digit}: ${e.present ? "포함" : "없음"}`).join(", ")
        : "없음";
    }

    // mouthOfTruthIntel
    if (elements.mouthOfTruthIntel) {
      elements.mouthOfTruthIntel.textContent = state.mouthOfTruthIntel
        ? `최다반복: ${state.mouthOfTruthIntel.digit}(${state.mouthOfTruthIntel.count}개)`
        : "없음";
    }

    elements.compassIntel.textContent = state.inventory.compass > 0
      ? `보상 +${state.inventory.compass * 25}% (${state.inventory.compass}중첩)`
      : "없음";
    elements.updownIntel.textContent = state.updownIntel;
    elements.retryIntel.textContent = state.inventory.retry > 0 ? `피해 무효 ${state.inventory.retry}회` : "없음";
    elements.bestRoundLabel.textContent = records.bestRound > 0 ? `${records.bestRound}라운드` : "—";

    if (kidsMode && state.phase === "playing") updateKidsMemos();
    renderCodeSlots(config);
    renderHistory();
    renderShopButtons();
    renderReward();
    renderKeypad();
    renderCandidateHints();
    syncInputLock();
    saveState();
  }

  function renderCodeSlots(config) {
    elements.codeSlots.innerHTML = "";
    elements.codeSlots.style.setProperty("--slot-count", Math.min(config.digits, 12));

    for (let index = 0; index < config.digits; index += 1) {
      const slot = document.createElement("div");
      const locked = state.locked.find((entry) => entry.index === index);
      let className = locked ? "code-slot revealed" : "code-slot";
      if (memoMode && memoTargetSlot === index) {
        className += " memo-target";
      }
      slot.className = className;
      slot.textContent = locked ? locked.digit : "?";

      // Show memo digits if any
      const memos = state.slotMemos[index];
      if (memos && memos.length > 0) {
        const memoSpan = document.createElement("span");
        memoSpan.className = "slot-memo";
        memoSpan.textContent = memos.join("");
        slot.appendChild(memoSpan);
      }

      if (memoMode) {
        slot.style.cursor = "pointer";
        slot.addEventListener("click", () => activateSlotMemo(index));
      }

      elements.codeSlots.append(slot);
    }
  }

  function renderHistory() {
    elements.historyList.innerHTML = "";
    const allEntries = state.history.slice(-10);
    const entries = allEntries.slice().reverse();

    if (entries.length === 0) {
      const empty = document.createElement("li");
      empty.className = "empty-log";
      empty.textContent = "아직 기록이 없습니다.";
      elements.historyList.append(empty);
      return;
    }

    // For log comparison: find differing digit positions between two selected entries
    let cmpPositions = null;
    if (selectedLogIndices.length === 2) {
      const [i1, i2] = selectedLogIndices;
      const e1 = allEntries[i1];
      const e2 = allEntries[i2];
      if (e1 && e2) {
        cmpPositions = { i1, i2, positions: [] };
        const maxLen = Math.max(e1.guess.length, e2.guess.length);
        for (let p = 0; p < maxLen; p++) {
          if (e1.guess[p] !== e2.guess[p]) {
            cmpPositions.positions.push(p);
          }
        }
      }
    }

    entries.forEach((entry, reversedIdx) => {
      // reversedIdx 0 = newest. The actual index in allEntries is (allEntries.length - 1 - reversedIdx)
      const actualIndex = allEntries.length - 1 - reversedIdx;
      const item = document.createElement("li");
      const isSelected = selectedLogIndices.includes(actualIndex);
      item.className = entry.solved
        ? "history-item solved" + (isSelected ? " log-selected" : "")
        : "history-item" + (isSelected ? " log-selected" : "");
      item.dataset.logIndex = actualIndex;

      let guessHtml = "";

      if (cmpPositions && (actualIndex === cmpPositions.i1 || actualIndex === cmpPositions.i2)) {
        for (let p = 0; p < entry.guess.length; p++) {
          if (cmpPositions.positions.includes(p)) {
            guessHtml += `<strong class="cmp-digit">${entry.guess[p]}</strong>`;
          } else {
            guessHtml += entry.guess[p];
          }
        }
      } else {
        guessHtml = entry.guess;
      }

      item.innerHTML = `
        <span>${guessHtml}</span>
        <strong>${entry.strikes}S ${entry.balls}B</strong>
        <small>${getHistoryNote(entry)}</small>
      `;

      item.addEventListener("click", () => {
        const idx = parseInt(item.dataset.logIndex, 10);
        const pos = selectedLogIndices.indexOf(idx);
        if (pos !== -1) {
          // Deselect
          selectedLogIndices.splice(pos, 1);
        } else if (selectedLogIndices.length < 2) {
          selectedLogIndices.push(idx);
        } else {
          // Replace oldest selection
          selectedLogIndices.shift();
          selectedLogIndices.push(idx);
        }
        renderHistory();
      });

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
      const item = SHOP_ITEMS[key];
      if (!item) return;
      const price = getItemPrice(key);
      const shopBoughtCount = state.shopBought[key] ?? 0;
      const shopLimit = item.shopLimit ?? 2;
      const remaining = shopLimit - shopBoughtCount;
      const shopMaxed = remaining <= 0;
      const soldOut =
        (key === "magnifier" && state.inventory.magnifier) ||
        (key === "duplicateDetector" && state.inventory.duplicateDetector) ||
        (item.gameOnce && state.usedOnce[key]);
      const tooEarly = item.minRound != null && state.round < item.minRound;

      button.disabled = state.gold < price || soldOut || shopMaxed || tooEarly;
      button.classList.toggle("sold-out", soldOut);
      button.classList.toggle("shop-maxed", shopMaxed && !soldOut);
      button.classList.toggle("too-early", tooEarly);

      const priceEl = button.querySelector("strong");
      if (priceEl) {
        if (soldOut) priceEl.textContent = "구매 완료";
        else if (tooEarly) priceEl.textContent = `${item.minRound}라운드~`;
        else if (shopMaxed) priceEl.textContent = "이번 구매 완료";
        else priceEl.textContent = `${price} Gold`;
      }

      const stockEl = button.querySelector(".shop-stock");
      if (stockEl) {
        stockEl.textContent = !soldOut && !tooEarly && !shopMaxed ? `재고 ${remaining}` : "";
      }
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
    if (!kidsMode) updateBestRound(state.round);
    clearSave();
    const kidsSuffix = kidsMode ? " (어린이 모드 — 기록 미저장)" : "";
    showOverlay(
      "Game Over",
      "도전 종료",
      `${state.round}라운드에서 쓰러졌습니다. 마지막 정답은 ${state.secret.join("")}였습니다.${kidsSuffix}`,
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
    if (!kidsMode) updateBestRound(nextRound);
    state.phase = "playing";
    state.attempts = 0;
    state.secret = generateCode(getRoundConfig(nextRound));
    state.eliminated = [];
    state.locked = [];
    state.parityIntel = [];
    state.updownIntel = "없음";
    state.history = [];
    state.lastReward = null;
    state.counterIntel = [];
    state.signalIntel = [];
    state.mouthOfTruthIntel = null;
    state.slotMemos = {};
    state.digitMemos = {};
    if (kidsMode) initKidsMemos(getRoundConfig(nextRound).digits);
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
    if (key === "duplicateDetector" && state.inventory.duplicateDetector) return;
    if (item.gameOnce && state.usedOnce[key]) return;
    const shopLimit = item.shopLimit ?? 2;
    if ((state.shopBought[key] ?? 0) >= shopLimit) return;

    state.gold -= price;
    state.shopBought[key] = (state.shopBought[key] ?? 0) + 1;

    if (key === "potion") {
      state.hp = Math.min(state.maxHp, state.hp + 2);
    } else if (key === "heart") {
      state.maxHp += 1;
      state.hp = Math.min(state.maxHp, state.hp + 1);
    } else if (key === "magnifier") {
      state.inventory.magnifier = true;
    } else if (key === "duplicateDetector") {
      state.inventory.duplicateDetector = true;
    } else if (key === "fullHeal") {
      state.hp = state.maxHp;
      state.usedOnce.fullHeal = true;
      state.inventory.fullHeal = true;
    } else if (key === "eyeOfTruth" || key === "mouthOfTruth" || key === "handOfTruth") {
      state.inventory[key] += 1;
      state.usedOnce[key] = true;
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

  function useCounter() {
    if (state.inventory.counter <= 0 || state.phase !== "playing") return;
    digitPickMode = "counter";
    setHint("카운터: 확인할 숫자를 선택하세요.", "warn");
    renderDigitPicker(true);
  }

  function useSignalDetector() {
    if (state.inventory.signalDetector <= 0 || state.phase !== "playing") return;
    digitPickMode = "signalDetector";
    setHint("신호 탐색기: 확인할 숫자를 선택하세요.", "warn");
    renderDigitPicker(true);
  }

  function useEyeOfTruth() {
    if (state.inventory.eyeOfTruth <= 0 || state.phase !== "playing") return;
    // reveal 2 random unlocked positions (like locker but 2 at once)
    let revealed = 0;
    for (let i = 0; i < 2; i++) {
      const pos = pickUnlockedPosition(state.secret, state.locked);
      if (!pos) break;
      state.locked.push(pos);
      revealed++;
    }
    state.inventory.eyeOfTruth -= 1;
    setHint(revealed > 0 ? `진실의 눈: ${revealed}개 자리가 공개되었습니다.` : "이미 모든 자리가 공개되었습니다.", revealed > 0 ? "success" : "warn");
    render();
  }

  function useMouthOfTruth() {
    if (state.inventory.mouthOfTruth <= 0 || state.phase !== "playing") return;
    const result = getMostRepeatedDigit(state.secret);
    state.mouthOfTruthIntel = result;
    state.inventory.mouthOfTruth -= 1;
    setHint(`진실의 입: 가장 많이 반복되는 숫자는 ${result.digit}(${result.count}개)입니다.`, "success");
    render();
  }

  function useHandOfTruth() {
    if (state.inventory.handOfTruth <= 0 || state.phase !== "playing") return;
    digitPickMode = "handOfTruth";
    setHint("진실의 손: 위치를 확인할 숫자를 선택하세요.", "warn");
    renderDigitPicker(true);
  }

  function renderDigitPicker(visible) {
    const picker = document.getElementById("digitPicker");
    if (!picker) return;
    picker.hidden = !visible;
  }

  function resolveDigitPick(digit) {
    const mode = digitPickMode;
    digitPickMode = null;
    renderDigitPicker(false);

    if (mode === "counter") {
      const cnt = countDigitOccurrences(state.secret, digit);
      state.counterIntel.push({ digit, count: cnt });
      state.inventory.counter -= 1;
      setHint(`카운터: ${digit}은(는) 정답에 ${cnt}개 포함됩니다.`, "success");
    } else if (mode === "signalDetector") {
      const present = state.secret.includes(digit);
      state.signalIntel.push({ digit, present });
      state.inventory.signalDetector -= 1;
      setHint(`신호 탐색기: ${digit}은(는) 정답에 ${present ? "포함됩니다" : "없습니다"}.`, "success");
    } else if (mode === "handOfTruth") {
      const positions = findAllPositions(state.secret, digit);
      positions.forEach((i) => {
        if (!state.locked.some((l) => l.index === i)) {
          state.locked.push({ digit, index: i });
        }
      });
      state.inventory.handOfTruth -= 1;
      setHint(`진실의 손: ${digit}은(는) ${positions.map((i) => `${i + 1}번째`).join(", ")} 자리에 있습니다.`, "success");
    }
    render();
  }

  function toggleMemoMode() {
    memoMode = !memoMode;
    memoTargetSlot = null;
    const btn = document.getElementById("memoToggleButton");
    if (btn) btn.classList.toggle("active", memoMode);
    document.querySelector(".mobile-keypad")?.classList.toggle("memo-visible", memoMode);
    renderCodeSlots(getRoundConfig(state.round));
    setHint(memoMode ? "메모 모드: 숫자 칸을 눌러 메모를 입력하세요." : "메모 모드 해제.", "normal");
  }

  function clearMemo() {
    state.slotMemos = {};
    state.digitMemos = {};
    renderCodeSlots(getRoundConfig(state.round));
    renderKeypad();
    saveState();
    setHint("메모가 초기화되었습니다.", "normal");
  }

  function activateSlotMemo(index) {
    memoTargetSlot = memoTargetSlot === index ? null : index;
    renderCodeSlots(getRoundConfig(state.round));
    renderMemoKeypad();
  }

  function renderMemoKeypad() {
    // In memo mode with target slot, digit buttons toggle digits in slotMemos
    // This updates visual state of keypad buttons
    renderKeypad();
  }

  function newRun() {
    state = initialState();
    state.secret = generateCode(getRoundConfig(1));
    if (kidsMode) initKidsMemos(getRoundConfig(1).digits);
    clearSave();
    hideOverlay();
    // Reset runtime state
    digitPickMode = null;
    memoMode = false;
    memoTargetSlot = null;
    selectedLogIndices = [];
    renderDigitPicker(false);
    const memoBtn = document.getElementById("memoToggleButton");
    if (memoBtn) memoBtn.classList.remove("active");
    document.querySelector(".mobile-keypad")?.classList.remove("memo-visible");
    const hintEl = document.getElementById("candidateHints");
    if (hintEl) hintEl.hidden = true;
    setHint("새 도전을 시작했습니다.", "normal");
    render();
    elements.guessInput.focus();
  }

  function handleKeypad(value) {
    const config = getRoundConfig(state.round);
    if (state.phase !== "playing") {
      return;
    }

    // If digitPickMode is active, route digit presses to resolveDigitPick
    if (digitPickMode !== null) {
      if (/^\d$/.test(value)) {
        resolveDigitPick(value);
      } else if (value === "back" || value === "enter") {
        // Cancel digit pick mode
        digitPickMode = null;
        renderDigitPicker(false);
        setHint("취소되었습니다.", "normal");
      }
      return;
    }

    // If memo mode with a target slot, route digit presses to slot memo
    if (memoMode && memoTargetSlot !== null) {
      if (/^\d$/.test(value)) {
        if (!state.slotMemos[memoTargetSlot]) {
          state.slotMemos[memoTargetSlot] = [];
        }
        const memos = state.slotMemos[memoTargetSlot];
        const idx = memos.indexOf(value);
        if (idx !== -1) {
          memos.splice(idx, 1);
        } else {
          memos.push(value);
          memos.sort();
        }
        renderCodeSlots(config);
        saveState();
        return;
      } else if (value === "back") {
        // "전체" in memo+slot mode: fill all non-X digits into slot memo
        const all = ["0","1","2","3","4","5","6","7","8","9"]
          .filter(d => state.digitMemos[d] !== "X");
        const existing = state.slotMemos[memoTargetSlot] ?? [];
        state.slotMemos[memoTargetSlot] = [...new Set([...existing, ...all])].sort();
        renderCodeSlots(config);
        saveState();
        return;
      } else if (value === "enter") {
        // Cancel memo mode
        toggleMemoMode();
        return;
      }
      return;
    }

    // If memo mode without target slot: digit presses cycle digitMemos annotation
    if (memoMode && /^\d$/.test(value)) {
      const current = state.digitMemos[value] ?? null;
      if (current === null) {
        state.digitMemos[value] = "O";
      } else if (current === "O") {
        state.digitMemos[value] = "X";
      } else {
        state.digitMemos[value] = null;
      }
      renderKeypad();
      saveState();
      return;
    }

    if (value === "back") {
      elements.guessInput.value = elements.guessInput.value.slice(0, -1);
      renderCandidateHints();
      return;
    }

    if (value === "enter") {
      elements.guessForm.requestSubmit();
      return;
    }

    if (/^\d$/.test(value) && elements.guessInput.value.length < config.digits) {
      elements.guessInput.value += value;
      renderCandidateHints();
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

  const MAX_CANDS = 500;

  function hasAnyIntel() {
    return state.eliminated.length > 0 ||
      state.locked.length > 0 ||
      state.parityIntel.length > 0 ||
      state.counterIntel.length > 0 ||
      state.signalIntel.length > 0 ||
      state.mouthOfTruthIntel !== null ||
      (state.updownIntel && state.updownIntel !== "없음");
  }

  function parseUpdownIntel() {
    if (!state.updownIntel || state.updownIntel === "없음") return null;
    const m = state.updownIntel.match(/^(\d+):\s*(UP|DOWN|SAME)$/);
    if (!m) return null;
    return { guess: m[1].split(""), dir: m[2] };
  }

  function computeConsistentCandidates(history, config) {
    const solvedEntries = history.filter(e => !e.solved);
    if (solvedEntries.length === 0 && !hasAnyIntel()) return null;

    const digits = config.digits;
    const pool = ["0","1","2","3","4","5","6","7","8","9"];
    const cands = [];
    const updownConstraint = parseUpdownIntel();

    function isConsistent(cur) {
      for (const entry of solvedEntries) {
        const r = judgeGuess(cur, entry.guess.split(""));
        if (r.strikes !== entry.strikes || r.balls !== entry.balls) return false;
      }
      for (const d of state.eliminated) {
        if (cur.includes(d)) return false;
      }
      for (const lock of state.locked) {
        if (cur[lock.index] !== lock.digit) return false;
      }
      for (const p of state.parityIntel) {
        const isEven = Number(cur[p.index]) % 2 === 0;
        const wantEven = p.parity === "짝수";
        if (isEven !== wantEven) return false;
      }
      for (const c of state.counterIntel) {
        if (countDigitOccurrences(cur, c.digit) !== c.count) return false;
      }
      for (const s of state.signalIntel) {
        if (cur.includes(s.digit) !== s.present) return false;
      }
      if (state.mouthOfTruthIntel) {
        const m = getMostRepeatedDigit(cur);
        if (m.digit !== state.mouthOfTruthIntel.digit ||
            m.count !== state.mouthOfTruthIntel.count) return false;
      }
      if (updownConstraint) {
        const d = compareGuessDirection(cur, updownConstraint.guess);
        if (d !== updownConstraint.dir) return false;
      }
      return true;
    }

    function generate(cur) {
      if (cands.length >= MAX_CANDS) return;
      if (cur.length === digits) {
        if (!config.allowDuplicate && new Set(cur).size !== digits) return;
        if (isConsistent(cur)) cands.push(cur.join(""));
        return;
      }
      for (const d of pool) {
        if (!config.allowDuplicate && cur.includes(d)) continue;
        generate([...cur, d]);
      }
    }

    generate([]);
    return cands;
  }

  function initKidsMemos(digits) {
    state.slotMemos = {};
    for (let i = 0; i < digits; i++) {
      state.slotMemos[i] = ["0","1","2","3","4","5","6","7","8","9"];
    }
  }

  function updateKidsMemos() {
    const config = getRoundConfig(state.round);
    const cands = computeConsistentCandidates(state.history, config);
    if (!cands || cands.length === 0) return;
    for (let i = 0; i < config.digits; i++) {
      const possible = new Set(cands.map(c => c[i]));
      if (state.slotMemos[i]) {
        state.slotMemos[i] = state.slotMemos[i].filter(d => possible.has(d));
      }
    }
  }

  function renderCandidateHints() {
    const hintEl = document.getElementById("candidateHints");
    if (!hintEl) return;

    if (!kidsMode || state.phase !== "playing" || state.history.length === 0) {
      hintEl.hidden = true;
      return;
    }

    const config = getRoundConfig(state.round);
    const cands = computeConsistentCandidates(state.history, config);
    if (!cands) { hintEl.hidden = true; return; }

    const prefix = elements.guessInput.value.trim();
    const filtered = prefix ? cands.filter(c => c.startsWith(prefix)) : cands;

    if (filtered.length === 0) { hintEl.hidden = true; return; }

    hintEl.hidden = false;
    const SHOW_ALL = 10;
    const CAP = 4;
    const shown = filtered.length <= SHOW_ALL ? filtered : filtered.slice(0, CAP);
    const extra = filtered.length > SHOW_ALL ? filtered.length - CAP : 0;

    const extraLabel = cands.length >= MAX_CANDS && filtered.length > SHOW_ALL
      ? `${MAX_CANDS}+개`
      : `외 ${filtered.length - CAP}개`;
    hintEl.innerHTML =
      shown.map(c => `<button type="button" class="hint-chip" data-value="${c}">${c}</button>`).join("") +
      (extra > 0 ? `<span class="hint-more">${extraLabel}</span>` : "");

    hintEl.querySelectorAll(".hint-chip").forEach(btn => {
      btn.addEventListener("click", () => {
        elements.guessInput.value = btn.dataset.value;
        hintEl.hidden = true;
      });
    });
  }

  function renderKeypad() {
    document.querySelectorAll("[data-keypad]").forEach((button) => {
      const val = button.dataset.keypad;
      if (/^\d$/.test(val)) {
        button.classList.toggle("eliminated", state.eliminated.includes(val));

        // Show annotation badge from digitMemos
        let annotationEl = button.querySelector(".keypad-annotation");
        const annotation = state.digitMemos[val] ?? null;
        if (annotation) {
          if (!annotationEl) {
            annotationEl = document.createElement("span");
            annotationEl.className = "keypad-annotation";
            button.appendChild(annotationEl);
          }
          annotationEl.textContent = annotation;
        } else if (annotationEl) {
          annotationEl.remove();
        }
      } else if (val === "back") {
        button.textContent = (memoMode && memoTargetSlot !== null) ? "전체" : "⌫";
      }
    });
  }

  function syncInputLock() {
    elements.guessInput.readOnly = window.matchMedia("(max-width: 560px)").matches;
  }

  // Event listeners
  elements.guessForm.addEventListener("submit", submitGuess);
  elements.guessInput.addEventListener("input", renderCandidateHints);
  elements.nextRoundButton.addEventListener("click", startNextRound);
  elements.newRunButton.addEventListener("click", () => {
    if (elements.kidsModeButton) {
      elements.kidsModeButton.textContent = `어린이 모드: ${kidsMode ? "ON" : "OFF"}`;
      elements.kidsModeButton.classList.toggle("active", kidsMode);
    }
    showOverlay("새 도전", "모드를 선택하세요", "어린이 모드에서는 가능한 숫자가 자동으로 표시됩니다.");
  });
  elements.overlayButton.addEventListener("click", newRun);
  if (elements.kidsModeButton) {
    elements.kidsModeButton.addEventListener("click", () => {
      kidsMode = !kidsMode;
      elements.kidsModeButton.textContent = `어린이 모드: ${kidsMode ? "ON" : "OFF"}`;
      elements.kidsModeButton.classList.toggle("active", kidsMode);
    });
  }
  elements.useEliminatorButton.addEventListener("click", useEliminator);
  elements.useLockerButton.addEventListener("click", useLocker);
  elements.useScannerButton.addEventListener("click", useScanner);
  elements.useUpdownButton.addEventListener("click", useUpdown);
  elements.useCounterButton.addEventListener("click", useCounter);
  elements.useSignalDetectorButton.addEventListener("click", useSignalDetector);
  elements.useEyeOfTruthButton.addEventListener("click", useEyeOfTruth);
  elements.useMouthOfTruthButton.addEventListener("click", useMouthOfTruth);
  elements.useHandOfTruthButton.addEventListener("click", useHandOfTruth);
  if (elements.memoToggleButton) {
    elements.memoToggleButton.addEventListener("click", toggleMemoMode);
  }
  if (elements.memoClearButton) {
    elements.memoClearButton.addEventListener("click", clearMemo);
  }
  if (elements.scrollToLogButton) {
    elements.scrollToLogButton.addEventListener("click", () => {
      const el = document.querySelector(".log-panel");
      if (el) {
        const top = el.getBoundingClientRect().top + window.pageYOffset - 60;
        window.scrollTo({ top, behavior: "smooth" });
      }
    });
  }
  if (elements.scrollToGameButton) {
    elements.scrollToGameButton.addEventListener("click", () => {
      const el = document.querySelector(".code-panel");
      if (el) {
        const top = el.getBoundingClientRect().top + window.pageYOffset - 60;
        window.scrollTo({ top, behavior: "smooth" });
      }
    });
  }
  document.querySelectorAll("[data-shop-item]").forEach((button) => {
    button.addEventListener("click", () => buyItem(button.dataset.shopItem));
  });
  document.querySelectorAll("[data-keypad]").forEach((button) => {
    button.addEventListener("click", () => handleKeypad(button.dataset.keypad));
  });
  // Digit picker buttons
  document.querySelectorAll("[data-pick]").forEach((button) => {
    button.addEventListener("click", () => {
      const pick = button.dataset.pick;
      if (pick === "cancel") {
        digitPickMode = null;
        renderDigitPicker(false);
        setHint("취소되었습니다.", "normal");
      } else if (/^\d$/.test(pick)) {
        if (digitPickMode !== null) {
          resolveDigitPick(pick);
        }
      }
    });
  });
  window.addEventListener("resize", syncInputLock);

  ensureRound();
  render();
})();
