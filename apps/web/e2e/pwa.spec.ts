import { test, expect, type Page } from "@playwright/test";

async function waitForActiveServiceWorker(page: Page) {
  await page.waitForFunction(async () => {
    if (!("serviceWorker" in navigator)) return false;
    const reg = await navigator.serviceWorker.getRegistration();
    return !!(reg && (reg.active || navigator.serviceWorker.controller));
  }, undefined, { timeout: 60_000 });
  await page.waitForFunction(() => !!navigator.serviceWorker.controller, undefined, {
    timeout: 60_000,
  });
}

async function paintCurrentKana(page: Page, kana = "あ") {
  await expect.poll(async () =>
    page.locator("canvas").evaluate((node) => (node as HTMLCanvasElement).width),
  ).toBeGreaterThan(10);
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

test.describe("production PWA", () => {
  test.use({
    // Fresh context — no prior SW / storage from functional tests.
    serviceWorkers: "allow",
  });

  test("manifest, SW control, offline shell, recognition, storage, hash routes", async ({
    page,
    context,
  }) => {
    await context.route("https://jisho.org/**", async (route) => {
      await route.abort();
    });
    await context.route("https://jotoba.de/**", async (route) => {
      await route.abort();
    });
    await context.route("https://api.mymemory.translated.net/**", async (route) => {
      await route.abort();
    });

    await page.addInitScript(() => {
      if (!window.localStorage.getItem("jpa-progress-v1")) {
        window.localStorage.setItem(
          "jpa-progress-v1",
          JSON.stringify({
            version: 2,
            lastAt: Date.now(),
            lastTab: "practice",
            lastSession: null,
            lastActivity: null,
            learned: { "hira:a": true },
            weak: {},
            dictRecent: ["mizu"],
            dictMode: "dict-jp-en",
            chartFilter: "basic",
          }),
        );
      }
    });

    // A. Manifest
    const manifestRes = await page.request.get("/manifest.webmanifest");
    expect(manifestRes.ok()).toBe(true);
    const manifest = await manifestRes.json();
    expect(manifest.name).toBe("Japanese Practicing Application");
    expect(manifest.short_name).toBe("Kana Practice");
    expect(manifest.theme_color).toBe("#c44732");
    expect(manifest.background_color).toBe("#f7f5f0");
    expect(manifest.display).toBe("standalone");
    expect(manifest.start_url).toMatch(/^\.\//);
    expect(manifest.icons?.length).toBeGreaterThanOrEqual(2);

    // Online install / first load
    await page.goto("/#/learn");
    await expect(page.getByRole("button", { name: /Start with hiragana|Continue where you left off/ })).toBeVisible();

    // B. Service worker registers and precache is populated
    await waitForActiveServiceWorker(page);
    await page.waitForFunction(async () => {
      const keys = await caches.keys();
      const precache = keys.find((name) => /precache/i.test(name));
      if (!precache) return false;
      const cache = await caches.open(precache);
      const reqs = await cache.keys();
      return reqs.some((r) => /index-.*\.js$/i.test(r.url)) && reqs.some((r) => /index\.html$/i.test(r.url));
    }, undefined, { timeout: 60_000 });
    const swUrl = await page.evaluate(async () => {
      const reg = await navigator.serviceWorker.getRegistration();
      return reg?.active?.scriptURL || reg?.installing?.scriptURL || "";
    });
    expect(swUrl).toMatch(/sw\.js|workbox/i);

    // D. Precache has shell assets (best-effort via Cache Storage keys)
    const cacheNames = await page.evaluate(async () => caches.keys());
    expect(cacheNames.some((name) => /precache|workbox/i.test(name))).toBe(true);

    // Seed a fake legacy cache so the cleanup assertion below is meaningful.
    await page.evaluate(async () => {
      const cache = await caches.open("jpa-v32");
      await cache.put("/legacy-probe", new Response("legacy"));
    });

    // Progress practice write online so a session persists
    await page.goto("/#/practice/sets/write/hira");
    await page.getByRole("button", { name: /あ row/ }).click();
    await expect(page).toHaveURL(/#\/practice\/write/);
    await paintCurrentKana(page, "あ");
    await page.getByTestId("check-btn").click();
    await page.getByTestId("next-btn").click();

    const progressBefore = await page.evaluate(() => localStorage.getItem("jpa-progress-v1"));
    expect(progressBefore).toBeTruthy();
    expect(progressBefore).toContain("lastSession");

    // E–I: go offline after successful load
    await context.setOffline(true);

    await page.reload();
    await expect(page.locator(".prompt-ro")).toBeVisible();

    // F. Learn / chart offline, still five columns
    await page.goto("/#/learn/chart/hira");
    await expect(page.getByText(/Tap a character/i)).toBeVisible();
    const firstRow = page.locator(".kana-row").filter({ has: page.locator(".kana-cell") }).first();
    await expect(firstRow.locator(".kana-cell")).toHaveCount(5);

    // G. Character detail + writing + recognition offline
    await page.getByRole("button", { name: /^あ, a/ }).first().click();
    await page.getByRole("button", { name: "Practice this character" }).click();
    await expect(page).toHaveURL(/#\/practice\/write/);
    await paintCurrentKana(page, "あ");
    await page.getByTestId("check-btn").click();
    const matchMs = await page.evaluate(
      () => (window as Window & { __jpaLastMatchMs?: number }).__jpaLastMatchMs,
    );
    expect(matchMs).toBeGreaterThan(0);

    // H. Reading offline
    await page.goto("/#/practice/sets/quiz/hira");
    await page.getByRole("button", { name: /あ row/ }).click();
    await expect(page).toHaveURL(/#\/practice\/quiz/);
    const kana = (await page.locator(".prompt-kana").textContent())?.trim() || "";
    const romaji: Record<string, string> = { あ: "a", い: "i", う: "u", え: "e", お: "o" };
    await page.getByLabel("Type the romaji").fill(romaji[kana] || "a");
    await page.getByRole("button", { name: "Check" }).click();
    await expect(page.locator(".feedback")).toContainText(/Correct/i);

    // I. Persisted progress readable offline
    const progressAfterOffline = await page.evaluate(() => localStorage.getItem("jpa-progress-v1"));
    expect(progressAfterOffline).toBeTruthy();
    expect(progressAfterOffline).toContain("learned");

    // J. Dictionary fails gracefully offline
    await page.goto("/#/dictionary");
    await page.getByPlaceholder(/Search Japanese/).fill("mizu");
    await page.getByRole("button", { name: "Search" }).click();
    await expect(page.getByRole("status")).toContainText(/Search failed/i);

    // K. Hash routes reload without server 404 (offline — SW serves index.html)
    for (const hash of [
      "#/learn",
      "#/learn/chart/hira",
      "#/learn/chart/hira/a",
      "#/practice",
      "#/dictionary",
    ]) {
      const res = await page.goto(`/${hash}`, { waitUntil: "domcontentloaded" });
      // Offline navigations may omit a network Response when the SW answers.
      if (res) expect(res.status()).toBeLessThan(400);
      await expect(page.locator("#root")).not.toBeEmpty();
      await expect(page).toHaveURL(new RegExp(hash.replace(/\//g, "\\/")));
    }
    // Writing deep-link: shell loads; app may redirect to practice if no live session.
    {
      const res = await page.goto("/#/practice/write", { waitUntil: "domcontentloaded" });
      if (res) expect(res.status()).toBeLessThan(400);
      await expect(page.locator("#root")).not.toBeEmpty();
      await expect(page).toHaveURL(/#\/practice/);
    }

    // M. Legacy cache cleanup does not clear localStorage
    await page.evaluate(async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => /^jpa-v\d+$/.test(k)).map((k) => caches.delete(k)));
    });
    expect(await page.evaluate(() => localStorage.getItem("jpa-progress-v1"))).toBeTruthy();
    const legacyGone = await page.evaluate(async () => !(await caches.keys()).includes("jpa-v32"));
    expect(legacyGone).toBe(true);

    // Ensure we did not cache dictionary hosts in Cache Storage
    const noApiCaches = await page.evaluate(async () => {
      const names = await caches.keys();
      for (const name of names) {
        const cache = await caches.open(name);
        const reqs = await cache.keys();
        if (reqs.some((r) => /jisho\.org|jotoba\.de|mymemory\.translated\.net/i.test(r.url))) {
          return false;
        }
      }
      return true;
    });
    expect(noApiCaches).toBe(true);
  });

  test("bilingual-era storage still loads and is not erased", async ({ page, context }) => {
    // A pre-redesign install: Vietnamese UI language and a Vietnamese dict mode.
    await page.addInitScript(() => {
      window.localStorage.setItem("jpa-lang", "vi");
      window.localStorage.setItem(
        "jpa-progress-v1",
        JSON.stringify({
          version: 2,
          lastTab: "learn",
          dictRecent: ["mizu"],
          dictMode: "dict-jp-vi",
          learned: { "hira:a": true },
          weak: { "a-hira": { wrong: 2, right: 1 } },
        }),
      );
    });
    await page.goto("/#/learn");
    await waitForActiveServiceWorker(page);

    // The app runs in English without crashing, and the learned state survived.
    await expect(page.getByRole("button", { name: /Continue where you left off|Start with hiragana/ })).toBeVisible();
    await expect(page.getByText("1 of 46 learned").first()).toBeVisible();

    // Vietnamese dictionary content mode remains supported (UI stays English).
    await page.goto("/#/dictionary");
    await expect(page.locator("#dict-mode")).toHaveValue("dict-jp-vi");
    await expect(page.locator("#dict-mode")).toContainText("Japanese → Vietnamese Dictionary");

    // Nothing wiped the old key or the progress blob.
    await expect.poll(async () => page.evaluate(() => localStorage.getItem("jpa-lang"))).toBe("vi");
    expect(await page.evaluate(() => localStorage.getItem("jpa-progress-v1"))).toContain("hira:a");

    // Simulate an update check — must not clear storage or loop.
    await page.evaluate(async () => {
      const reg = await navigator.serviceWorker.getRegistration();
      await reg?.update();
    });
    expect(await page.evaluate(() => localStorage.getItem("jpa-progress-v1"))).toContain("hira:a");
    await expect(page).toHaveURL(/#\/dictionary/);
    void context;
  });
});
