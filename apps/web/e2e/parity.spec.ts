import { test, expect, type Page, type Route } from "@playwright/test";

async function ready(page: Page) {
  await page.route("https://jisho.org/**", async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        data: [{
          japanese: [{ word: "水", reading: "みず" }],
          senses: [{ english_definitions: ["water"], parts_of_speech: ["Noun"] }],
        }],
      }),
    });
  });
  await page.route("https://jotoba.de/**", async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        words: [{
          reading: { kanji: "水", kana: "みず", furigana: "[水|みず]" },
          senses: [{ glosses: ["water"], pos: ["Noun"] }],
        }],
      }),
    });
  });
  await page.route("https://api.mymemory.translated.net/**", async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ responseData: { translatedText: "水" } }),
    });
  });
  await page.route(/translate\.(googleapis|google)\.com\/translate_tts/, async (route: Route) => {
    await route.abort();
  });
}

async function paintCurrentKana(page: Page, kana = "あ") {
  await expect.poll(async () => page.locator("canvas").evaluate((node) => (node as HTMLCanvasElement).width)).toBeGreaterThan(10);
  await page.evaluate(async (ch) => {
    await document.fonts.ready;
    const canvas = document.querySelector("canvas") as HTMLCanvasElement | null;
    if (!canvas) throw new Error("missing canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("missing ctx");
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = "#1d1c19";
    ctx.font = `700 ${Math.floor(canvas.height * 0.72)}px "Noto Sans JP"`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(ch, canvas.width / 2, canvas.height / 2);
  }, kana);
}

/** Open the character detail for `ro`, then start writing practice from it. */
async function practiceFromChart(page: Page, script = "hira", label = /^あ, a/) {
  await page.goto(`/#/learn/chart/${script}`);
  await page.getByRole("button", { name: label }).first().click();
  await page.getByRole("button", { name: "Practice this character" }).click();
  await expect(page).toHaveURL(/#\/practice\/write/);
}

test.describe("web critical flows", () => {
  test("FLOW 1: Learn → chart → character → write → Check → Next", async ({ page }) => {
    await ready(page);
    await page.goto("/#/learn");
    await page.getByRole("button", { name: /Start with hiragana/ }).click();
    await expect(page).toHaveURL(/#\/learn\/chart\/hira/);

    await page.getByRole("button", { name: /^あ, a/ }).first().click();
    await expect(page).toHaveURL(/#\/learn\/chart\/hira\/a/);
    await expect(page.locator(".detail-glyph")).toHaveText("あ");

    await page.getByRole("button", { name: "Practice this character" }).click();
    await expect(page).toHaveURL(/#\/practice\/write/);
    await paintCurrentKana(page, "あ");
    await page.getByTestId("check-btn").click();
    await expect(page.locator(".pad-verdict").first()).toContainText(/Correct|Not quite|looks more like/i);
    await page.getByTestId("next-btn").click();
    await expect(page.locator(".prompt-ro")).toHaveText("i");
  });

  test("FLOW 2: Practice writing あ row progress", async ({ page }) => {
    await ready(page);
    await page.goto("/#/practice/sets/write/hira");
    await page.getByRole("button", { name: /あ row/ }).click();
    await expect(page).toHaveURL(/#\/practice\/write/);
    await paintCurrentKana(page, "あ");
    await page.getByTestId("check-btn").click();
    await expect.poll(async () =>
      page.evaluate(() => (window as Window & { __jpaLastMatchMs?: number }).__jpaLastMatchMs || 0),
    ).toBeGreaterThan(0);
    await expect(page.locator(".stage-progress .count")).toContainText("/ 5");
    await page.getByTestId("next-btn").click();
    await expect(page.locator(".prompt-ro")).not.toHaveText("a");
  });

  test("FLOW 3: Reading answer, Skip, summary", async ({ page }) => {
    await ready(page);
    await page.goto("/#/practice/sets/quiz/hira");
    await page.getByRole("button", { name: /あ row/ }).click();
    await expect(page).toHaveURL(/#\/practice\/quiz/);
    const kana = (await page.locator(".prompt-kana").textContent())?.trim() || "";
    const romaji: Record<string, string> = { あ: "a", い: "i", う: "u", え: "e", お: "o" };
    await page.getByLabel("Type the romaji").fill(romaji[kana] || "a");
    await page.getByRole("button", { name: "Check" }).click();
    await expect(page.locator(".feedback")).toContainText("Correct");
    for (let i = 0; i < 8; i++) {
      if (await page.getByRole("heading", { name: "Session complete" }).isVisible().catch(() => false)) break;
      await page.getByRole("button", { name: "Skip" }).click();
    }
    await expect(page.getByRole("heading", { name: "Session complete" })).toBeVisible();
  });

  test("FLOW 4: reload then Continue restores the session", async ({ page }) => {
    await ready(page);
    await page.goto("/#/practice/sets/write/hira");
    await page.getByRole("button", { name: /あ row/ }).click();
    await paintCurrentKana(page, "あ");
    await page.getByTestId("check-btn").click();
    await page.getByTestId("next-btn").click();
    const romaji = (await page.locator(".prompt-ro").textContent())?.trim();
    await page.reload();
    await page.goto("/#/practice");
    await page.getByRole("button", { name: /Continue where you left off/ }).click();
    await expect(page).toHaveURL(/#\/practice\/write/);
    await expect(page.locator(".prompt-ro")).toHaveText(romaji || "");
    await expect(page.locator(".stage-progress .count")).toContainText("/ 5");
  });

  test("FLOW 5: Dictionary shows term, reading, romaji, gloss and part of speech", async ({ page }) => {
    await ready(page);
    await page.goto("/#/dictionary");
    await page.getByPlaceholder(/Search Japanese/).fill("mizu");
    await page.getByRole("button", { name: "Search" }).click();
    await expect(page.locator(".entry-jp").first()).toContainText("水");
    await expect(page.locator("rt")).toHaveText("みず");
    await expect(page.locator(".entry-pos").first()).toHaveText("Noun");
    await expect(page.getByText("water")).toBeVisible();
  });

  test("FLOW 6: Jisho failure falls back to Jotoba", async ({ page }) => {
    await ready(page);
    await page.unroute("https://jisho.org/**");
    await page.route("https://jisho.org/**", async (route) => {
      await route.abort();
    });
    await page.goto("/#/dictionary");
    await page.getByPlaceholder(/Search Japanese/).fill("水");
    await page.getByRole("button", { name: "Search" }).click();
    await expect(page.locator(".entry-jp").first()).toContainText("水");
    await expect(page.getByText("water")).toBeVisible();
  });

  test("navigation: bottom tabs when narrow, left rail on desktop", async ({ page }) => {
    await ready(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/#/learn");
    await expect(page.locator(".tabbar")).toBeVisible();
    await expect(page.locator(".rail")).toBeHidden();
    await page.locator(".tabbar").getByRole("link", { name: "Dictionary" }).click();
    await expect(page).toHaveURL(/#\/dictionary/);

    await page.setViewportSize({ width: 1280, height: 900 });
    await expect(page.locator(".rail")).toBeVisible();
    await expect(page.locator(".tabbar")).toBeHidden();
    await page.locator(".rail").getByRole("link", { name: "Practice" }).click();
    await expect(page).toHaveURL(/#\/practice/);
  });

  test("full recognition path: canvas pixels → matchInk → UI", async ({ page }) => {
    await ready(page);
    await practiceFromChart(page);
    await paintCurrentKana(page, "あ");
    await page.getByTestId("check-btn").click();
    const ms = await page.evaluate(() => (window as Window & { __jpaLastMatchMs?: number }).__jpaLastMatchMs);
    expect(ms).toBeGreaterThan(0);
    await expect(page.locator(".pad-verdict").first()).toContainText(/Correct|Not quite|looks more like/i);
  });
});
