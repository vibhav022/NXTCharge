import { chromium } from '@playwright/test';
import { copyFileSync } from 'node:fs';

const artifactDir = "C:/Users/jyant/.gemini/antigravity/brain/f6f15af9-6436-47fa-8088-d88cba4cb6f4";

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();

  console.log("Navigating to http://localhost:5173...");
  await page.goto("http://localhost:5173", { waitUntil: "networkidle" });

  // Scroll to calculator
  const estimator = page.locator(".estimator-section");
  await estimator.scrollIntoViewIfNeeded();
  await page.waitForTimeout(500);

  // 1. Screenshot default EV vs Petrol Savings Calculator (1,500 km)
  await estimator.screenshot({ path: "./data/savings-calculator-default.png" });
  copyFileSync("./data/savings-calculator-default.png", `${artifactDir}/savings-calculator-default.png`);
  console.log("Captured savings-calculator-default.png");

  // 2. Click "High (2,500 km)" preset chip
  console.log("Clicking 2,500 km chip...");
  await page.getByRole("button", { name: "High (2,500 km)" }).click();
  await page.waitForTimeout(400);

  // Screenshot at 2,500 km
  await estimator.screenshot({ path: "./data/savings-calculator-2500km.png" });
  copyFileSync("./data/savings-calculator-2500km.png", `${artifactDir}/savings-calculator-2500km.png`);
  console.log("Captured savings-calculator-2500km.png");

  // 3. Switch to "Charge & Range Estimator" mode
  console.log("Switching to Charge & Range Estimator...");
  await page.getByRole("tab", { name: "Charge & Range Estimator" }).click();
  await page.waitForTimeout(400);

  // Screenshot top-up estimator
  await estimator.screenshot({ path: "./data/range-estimator-tab.png" });
  copyFileSync("./data/range-estimator-tab.png", `${artifactDir}/range-estimator-tab.png`);
  console.log("Captured range-estimator-tab.png");

  // Also take full desktop screenshot showing the section in context
  await page.screenshot({ path: "./data/full-home-with-savings.png" });
  copyFileSync("./data/full-home-with-savings.png", `${artifactDir}/full-home-with-savings.png`);
  console.log("Captured full-home-with-savings.png");

  await browser.close();
  console.log("Screenshots captured successfully!");
})().catch(err => {
  console.error("Error during savings test:", err);
  process.exit(1);
});
