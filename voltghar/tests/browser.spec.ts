import { test, expect } from "@playwright/test";
const url = "http://localhost:5173";
const password = process.env.SEED_PASSWORD || "change-this-local-password";
async function login(page: any, role: string) {
  await page.goto(url);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.getByLabel("Email address").fill(`${role}@voltghar.local`);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Sign in", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
}
test("discovery filters, mobile layout and booking round trip", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await login(page, "driver");
  await expect(page.locator(".charger-card")).toHaveCount(6);
  await page.getByRole("button", { name: "Solar hosts", exact: true }).click();
  await expect(page.locator(".charger-card")).toHaveCount(4);
  await page.getByRole("button", { name: "Solar hosts", exact: true }).click();
  await page.getByLabel("Search neighborhood").fill("Indiranagar");
  await expect(page.locator(".charger-card")).toHaveCount(1);
  await page.getByRole("button", { name: "View & book" }).click();
  const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  await page
    .getByLabel("Arrival · India Standard Time")
    .fill(tomorrow + "T10:00");
  await page
    .getByLabel("Departure · India Standard Time")
    .fill(tomorrow + "T12:00");
  await page.getByRole("button", { name: "Reserve charging spot" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(
    page
      .locator(".booking-card")
      .filter({ has: page.locator(".status.confirmed") }),
  ).toHaveCount(1);
  await page
    .getByRole("button", { name: "Cancel booking", exact: true })
    .click();
  await expect(page.locator(".status.confirmed")).toHaveCount(0);
  await page.getByRole("button", { name: "Discover chargers" }).click();
  await page.getByLabel("Search neighborhood").fill("");
  await page.screenshot({ path: "../voltghar-desktop.png", fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => document.fonts.ready);
  await expect.poll(() => page.locator(".sidebar").evaluate(e => e.getBoundingClientRect().right)).toBeLessThanOrEqual(0);
  await expect
    .poll(() =>
      page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    )
    .toBe(true);
  await page.screenshot({ path: "../voltghar-mobile.png", fullPage: true });
  expect(errors).toEqual([]);
});
test("host submission persists and administrator approves it", async ({
  page,
}) => {
  await login(page, "host");
  await page
    .getByRole("button", { name: "Host workspace", exact: true })
    .click();
  await page.getByRole("button", { name: "Add charging point" }).click();
  const name = "Test host " + Date.now();
  await page.getByLabel("Charging point name").fill(name);
  await page.getByLabel("Neighborhood", { exact: true }).fill("Test Bengaluru");
  await page
    .getByLabel("Private street address")
    .fill("Private address for automated test");
  await page.getByRole("button", { name: "Submit for review" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByRole("row").filter({ hasText: name })).toContainText(
    "pending",
  );
  await page.getByTitle("Sign out").click();
  await login(page, "admin");
  await page
    .getByRole("button", { name: "Administration", exact: true })
    .click();
  const row = page.getByRole("row").filter({ hasText: name });
  await row.getByRole("button", { name: "Approve", exact: true }).click();
  await expect(row).toContainText("approved");
  await row.getByRole("button", { name: "Reject", exact: true }).click();
  await expect(row).toContainText("rejected");
});
