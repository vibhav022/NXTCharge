import { chromium } from '@playwright/test';
import { copyFileSync } from 'node:fs';

const artifactDir = "C:/Users/jyant/.gemini/antigravity/brain/f6f15af9-6436-47fa-8088-d88cba4cb6f4";

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();

  console.log("Navigating to http://localhost:5173...");
  await page.goto("http://localhost:5173", { waitUntil: "networkidle" });

  // 1. Open Sign in modal
  console.log("Opening Sign In modal...");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.waitForSelector("[role=dialog]");

  // Screenshot the modal (Member tab)
  await page.screenshot({ path: "./data/modal-signin-member.png" });
  copyFileSync("./data/modal-signin-member.png", `${artifactDir}/modal-signin-member.png`);
  console.log("Captured modal-signin-member.png");

  // 2. Click "Network Admin" tab
  console.log("Switching to Network Admin tab...");
  await page.getByRole("button", { name: "Network Admin" }).click();
  await page.waitForTimeout(300);

  // Screenshot the modal (Admin tab)
  await page.screenshot({ path: "./data/modal-admin-portal.png" });
  copyFileSync("./data/modal-admin-portal.png", `${artifactDir}/modal-admin-portal.png`);
  console.log("Captured modal-admin-portal.png");

  // 3. Click "Sign in as Administrator"
  console.log("Signing in as Administrator...");
  await page.getByRole("button", { name: "Sign in as Administrator" }).click();

  // Wait for Admin workspace to appear
  await page.waitForSelector(".table-wrap table");
  await page.waitForTimeout(600);

  // Screenshot Admin Workspace with Pending Charger
  await page.screenshot({ path: "./data/admin-workspace-pending.png" });
  copyFileSync("./data/admin-workspace-pending.png", `${artifactDir}/admin-workspace-pending.png`);
  console.log("Captured admin-workspace-pending.png");

  // 4. Find the row for nxtcharge and click Approve
  const row = page.getByRole("row").filter({ hasText: "nxtcharge" });
  console.log("Clicking Approve on nxtcharge...");
  await row.getByRole("button", { name: "Approve", exact: true }).click();

  // Wait for status to become approved
  await page.waitForTimeout(1000);

  // Screenshot Admin Workspace with Approved Charger
  await page.screenshot({ path: "./data/admin-workspace-approved.png" });
  copyFileSync("./data/admin-workspace-approved.png", `${artifactDir}/admin-workspace-approved.png`);
  console.log("Captured admin-workspace-approved.png");

  // 5. Navigate to Discover page
  console.log("Navigating to Discover page...");
  await page.getByRole("button", { name: "Discover chargers" }).click();
  await page.waitForTimeout(800);

  // Screenshot Discover page showing the newly approved charger live!
  await page.screenshot({ path: "./data/discover-with-approved-station.png" });
  copyFileSync("./data/discover-with-approved-station.png", `${artifactDir}/discover-with-approved-station.png`);
  console.log("Captured discover-with-approved-station.png");

  await browser.close();
  console.log("All steps completed successfully!");
})().catch(err => {
  console.error("Error during admin test:", err);
  process.exit(1);
});
