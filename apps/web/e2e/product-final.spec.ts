import { expect, test } from "@playwright/test";

/**
 * FINAL STEP 1 product-change regression (web).
 * Complements kana-grid / PWA / parity suites.
 */
test.describe("FINAL STEP 1 product changes", () => {
  test("Learn has Explore chart filters and no Recently learned", async ({ page }) => {
    await page.goto("/#/learn");
    await expect(page.getByRole("heading", { name: "Explore" })).toBeVisible();
    await expect(page.getByRole("button", { name: /Basic/i }).first()).toBeVisible();
    await expect(page.getByRole("button", { name: /Dakuten/i }).first()).toBeVisible();
    await expect(page.getByRole("button", { name: /Yōon|Yoon/i }).first()).toBeVisible();
    await expect(page.getByRole("button", { name: /^All/i }).first()).toBeVisible();
    await expect(page.getByText("Recently learned")).toHaveCount(0);
    await expect(page.getByText("pad_placeholder")).toHaveCount(0);
  });

  test("Dictionary offers JP↔VI modes in a compact selector", async ({ page }) => {
    await page.goto("/#/dictionary");
    const select = page.locator("#dict-mode");
    await expect(select).toBeVisible();
    const labels = await select.locator("option").allTextContents();
    expect(labels.join(" | ")).toContain("Japanese → Vietnamese Dictionary");
    expect(labels.join(" | ")).toContain("Vietnamese → Japanese Translation");
    expect(labels.join(" | ")).toContain("Japanese → Vietnamese Translation");
    expect(labels.join(" | ")).toContain("Japanese → English Dictionary");
    await expect(page.getByText("pad_placeholder")).toHaveCount(0);
  });

  test("Writing hides answer kana before Check and never shows pad_placeholder", async ({ page }) => {
    await page.goto("/#/practice/sets/write/hira");
    await page.getByRole("button", { name: /あ row/ }).click();
    await expect(page).toHaveURL(/#\/practice\/write/);
    await expect(page.getByTestId("check-btn")).toBeVisible();
    await expect(page.getByTestId("write-reveal")).toHaveCount(0);
    await expect(page.getByText("pad_placeholder")).toHaveCount(0);
    await expect(page.locator(".pad-guide:not(.is-hidden)")).toHaveCount(0);
  });
});
