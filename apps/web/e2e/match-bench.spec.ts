import { test, expect } from "@playwright/test";

test.describe("matchInk Chromium bench", () => {
  test("reports deterministic Node-equivalent cases in Chromium", async ({ page }) => {
    await page.goto("/#/__match-bench");
    await expect(page.locator("#match-bench-json")).not.toHaveText("running", { timeout: 120000 });
    const json = await page.locator("#match-bench-json").innerText();
    const report = JSON.parse(json) as {
      runtime: string;
      templateCounts: { hira: number; kata: number };
      cases: Array<{
        id: string;
        medianMs: number;
        naiveMedianMs: number | null;
        profile: { candidates: number; shiftedMetricsCalls: number } | null;
        status: string;
      }>;
    };
    expect(report.runtime.toLowerCase()).toMatch(/chrome|chromium|edg/);
    expect(report.templateCounts).toEqual({ hira: 104, kata: 104 });
    expect(report.cases.map((c) => c.id)).toEqual([
      "hira:a",
      "hira:ki",
      "hira:kya",
      "kata:shi",
      "kata:tsu",
      "kata:so",
      "kata:n",
    ]);
    for (const row of report.cases) {
      expect(row.status).toBe("ok");
      expect(row.profile?.candidates).toBe(104);
      expect(row.medianMs).toBeGreaterThan(0);
      expect(row.naiveMedianMs).toBeGreaterThan(0);
    }
    const hira = report.cases.find((c) => c.id === "hira:a")!;
    const kata = report.cases.find((c) => c.id === "kata:shi")!;
    expect(kata.profile!.shiftedMetricsCalls).toBe(hira.profile!.shiftedMetricsCalls * 2);
    console.log("[JPA_MATCH_BENCH_CHROMIUM]", JSON.stringify(report.cases.map((c) => ({
      id: c.id,
      medianMs: c.medianMs,
      naiveMedianMs: c.naiveMedianMs,
      candidates: c.profile?.candidates,
      shiftedMetricsCalls: c.profile?.shiftedMetricsCalls,
    }))));
  });
});
