(function initCore(global) {
  const SHOP_ITEMS = {
    potion: { name: "체력 물약", price: 30 },
    heart: { name: "심장 확장기", price: 100 },
    eliminator: { name: "숫자 제거기", price: 40 },
    locker: { name: "위치 고정장치", price: 60 },
    magnifier: { name: "분석용 돋보기", price: 150 },
  };

  function getRoundConfig(round) {
    if (round <= 5) {
      return {
        round,
        digits: round,
        allowDuplicate: false,
        phase: "Phase 1",
        mode: "정규 모드",
        feature: "기초",
      };
    }

    if (round <= 14) {
      return {
        round,
        digits: round - 3,
        allowDuplicate: true,
        phase: "Phase 2",
        mode: "정규 모드",
        feature: "심화",
      };
    }

    if (round === 15) {
      return {
        round,
        digits: 12,
        allowDuplicate: true,
        phase: "Final",
        mode: "보스 라운드",
        feature: "보스",
      };
    }

    return {
      round,
      digits: 12 + Math.floor((round - 16) / 3),
      allowDuplicate: true,
      phase: "Infinite",
      mode: "무한 모드",
      feature: "한계 도전",
    };
  }

  function generateCode(config, random = Math.random) {
    const pool = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"];

    if (!config.allowDuplicate) {
      const available = [...pool];
      const code = [];
      while (code.length < config.digits) {
        const index = Math.floor(random() * available.length);
        code.push(available.splice(index, 1)[0]);
      }
      return code;
    }

    return Array.from({ length: config.digits }, () => pool[Math.floor(random() * pool.length)]);
  }

  function judgeGuess(secret, guess) {
    const remainingSecret = [];
    const remainingGuess = [];
    let strikes = 0;

    for (let index = 0; index < secret.length; index += 1) {
      if (secret[index] === guess[index]) {
        strikes += 1;
      } else {
        remainingSecret.push(secret[index]);
        remainingGuess.push(guess[index]);
      }
    }

    let balls = 0;
    for (const digit of remainingGuess) {
      const hitIndex = remainingSecret.indexOf(digit);
      if (hitIndex !== -1) {
        balls += 1;
        remainingSecret.splice(hitIndex, 1);
      }
    }

    return { strikes, balls, solved: strikes === secret.length };
  }

  function validateGuess(value, config) {
    if (!/^\d+$/.test(value)) {
      return "숫자만 입력할 수 있습니다.";
    }

    if (value.length !== config.digits) {
      return `${config.digits}자리 숫자를 입력하세요.`;
    }

    if (!config.allowDuplicate && new Set(value).size !== value.length) {
      return "이번 라운드는 중복 숫자를 사용할 수 없습니다.";
    }

    return "";
  }

  function calculateReward(round, attempts) {
    const base = round * 10;
    if (attempts <= 3) {
      return { base, bonusLabel: "Perfect", multiplier: 2, total: base * 2 };
    }
    if (attempts <= 5) {
      return { base, bonusLabel: "Great", multiplier: 1.5, total: Math.round(base * 1.5) };
    }
    if (attempts <= 7) {
      return { base, bonusLabel: "Good", multiplier: 1.2, total: Math.round(base * 1.2) };
    }
    return { base, bonusLabel: "Normal", multiplier: 1, total: base };
  }

  function countDuplicateKinds(secret) {
    const counts = new Map();
    secret.forEach((digit) => counts.set(digit, (counts.get(digit) ?? 0) + 1));
    return [...counts.values()].filter((count) => count > 1).length;
  }

  function pickAbsentDigits(secret, alreadyEliminated, amount = 2, random = Math.random) {
    const secretSet = new Set(secret);
    const excluded = new Set(alreadyEliminated);
    const candidates = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"].filter(
      (digit) => !secretSet.has(digit) && !excluded.has(digit),
    );
    const picked = [];

    while (candidates.length > 0 && picked.length < amount) {
      const index = Math.floor(random() * candidates.length);
      picked.push(candidates.splice(index, 1)[0]);
    }

    return picked;
  }

  function pickUnlockedPosition(secret, lockedPositions, random = Math.random) {
    const open = secret
      .map((digit, index) => ({ digit, index }))
      .filter((entry) => !lockedPositions.some((locked) => locked.index === entry.index));

    if (open.length === 0) {
      return null;
    }

    return open[Math.floor(random() * open.length)];
  }

  const api = {
    SHOP_ITEMS,
    calculateReward,
    countDuplicateKinds,
    generateCode,
    getRoundConfig,
    judgeGuess,
    pickAbsentDigits,
    pickUnlockedPosition,
    validateGuess,
  };

  global.NumberChallengeCore = api;

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof window !== "undefined" ? window : globalThis);
