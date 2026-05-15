const { chromium } = require("playwright");
const { pathToFileURL } = require("node:url");
const path = require("node:path");

(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  });
  const page = await browser.newPage({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  const errors = [];

  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") {
      errors.push(message.text());
    }
  });

  const save = {
    round: 1,
    hp: 10,
    maxHp: 10,
    gold: 0,
    attempts: 0,
    inventory: { eliminator: 0, locker: 0, magnifier: false },
    phase: "playing",
    secret: ["1"],
    eliminated: [],
    locked: [],
    history: [],
    lastReward: null,
  };

  await page.addInitScript((state) => {
    localStorage.setItem("number-challenge-save", JSON.stringify(state));
  }, save);
  await page.goto(pathToFileURL(path.join(__dirname, "..", "index.html")).href);
  const isReadOnly = await page.locator("#guessInput").evaluate((input) => input.readOnly);
  console.log(isReadOnly ? "mobile input locked ok" : "mobile input locked failed");
  await page.locator("[data-keypad='0']").click();
  await page.locator("[data-keypad='enter']").click();
  let text = await page.locator("body").innerText();
  console.log(text.includes("0S 0B") && text.includes("HP -1") ? "mobile keypad wrong ok" : "mobile keypad wrong failed");

  await page.locator("[data-keypad='1']").click();
  await page.locator("[data-keypad='enter']").click();
  text = await page.locator("body").innerText();
  console.log(text.includes("Perfect") && text.includes("상점") ? "mobile clear/shop ok" : "mobile clear/shop failed");
  console.log(errors.length ? errors.join("\n") : "no console errors");

  await page.screenshot({ path: "qa-number-challenge-mobile.png", fullPage: true });
  await browser.close();
})();
