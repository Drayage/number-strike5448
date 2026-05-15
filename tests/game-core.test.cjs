const assert = require("node:assert/strict");
const {
  calculateReward,
  compareGuessDirection,
  countDuplicateKinds,
  getRoundConfig,
  judgeGuess,
  pickAbsentDigits,
  validateGuess,
} = require("../src/game-core.js");

assert.deepEqual(judgeGuess(["1", "1", "2"], ["1", "2", "3"]), {
  strikes: 1,
  balls: 1,
  solved: false,
});

assert.deepEqual(judgeGuess(["4", "5", "4", "1"], ["4", "4", "5", "1"]), {
  strikes: 2,
  balls: 2,
  solved: false,
});

assert.equal(compareGuessDirection(["5", "0"], ["4", "9"]), "UP");
assert.equal(compareGuessDirection(["5", "0"], ["5", "1"]), "DOWN");
assert.equal(compareGuessDirection(["5", "0"], ["5", "0"]), "SAME");

assert.equal(validateGuess("112", getRoundConfig(3)), "이번 라운드는 중복 숫자를 사용할 수 없습니다.");
assert.equal(validateGuess("112", getRoundConfig(6)), "");

assert.equal(getRoundConfig(1).digits, 1);
assert.equal(getRoundConfig(5).allowDuplicate, false);
assert.equal(getRoundConfig(6).digits, 3);
assert.equal(getRoundConfig(15).digits, 12);
assert.equal(getRoundConfig(18).digits, 12);
assert.equal(getRoundConfig(19).digits, 13);

assert.deepEqual(calculateReward(4, 3), {
  base: 120,
  bonusLabel: "Perfect",
  multiplier: 2,
  total: 240,
  compassBonus: 0,
});

assert.deepEqual(calculateReward(10, 6), {
  base: 300,
  bonusLabel: "Good",
  multiplier: 1.2,
  total: 360,
  compassBonus: 0,
});

assert.deepEqual(calculateReward(10, 6, 2), {
  base: 300,
  bonusLabel: "Good",
  multiplier: 1.2,
  total: 540,
  compassBonus: 180,
});

assert.equal(countDuplicateKinds(["1", "1", "2", "3", "3", "3"]), 2);
assert.deepEqual(pickAbsentDigits(["1", "2", "3"], ["4"], 10, () => 0), ["0", "5", "6", "7", "8", "9"]);

console.log("game-core tests passed");
