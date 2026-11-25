import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "tests",
  testMatch: "**/*.spec.ts",
  workers: 1,
  use: { headless: true, viewport: { width: 1440, height: 1080 } },
  reporter: "list",
});
