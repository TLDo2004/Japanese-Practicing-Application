import { describe, expect, it } from "vitest";
import { matchInk } from "./matchInk";
import { matchInkUnoptimized } from "./matchInk.naive";
import { runMatchInkBench, getBenchCases, getBenchTemplates } from "./matchInk.bench";
import { loadGlyphTemplates } from "./templates";
import { getTemplateLoadStats } from "./matchProfile";
import glyphsJson from "../templates/glyphs.json";
import type { PackedGlyphFile } from "./templates";

describe("deterministic matchInk bench", () => {
  it("runs the representative cases and reports candidate/hotspot counts", () => {
    const report = runMatchInkBench({ warmup: 1, rounds: 3, naive: true, naiveRounds: 1, profile: true });
    expect(report.templateCounts.hira).toBe(104);
    expect(report.templateCounts.kata).toBe(104);
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
      expect(row.profile?.templatesConsidered).toBe(104);
      expect(row.profile?.shiftedMetricsCalls).toBe(row.alphabet === "kata" ? 208 : 104);
      expect(row.profile?.dilateCacheHits).toBeGreaterThanOrEqual(104);
      expect(row.medianMs).toBeGreaterThan(0);
      expect(row.naiveMedianMs).toBeGreaterThan(0);
    }
    const hira = report.cases.find((c) => c.id === "hira:a")!;
    const kata = report.cases.find((c) => c.id === "kata:shi")!;
    expect(kata.profile!.shiftedMetricsCalls).toBe(hira.profile!.shiftedMetricsCalls * 2);
    console.log("[JPA_MATCH_BENCH_NODE]", JSON.stringify({
      runtime: report.runtime,
      loadStats: report.loadStats,
      rows: report.cases.map((c) => ({
        id: c.id,
        status: c.status,
        medianMs: Number(c.medianMs.toFixed(2)),
        naiveMedianMs: c.naiveMedianMs != null ? Number(c.naiveMedianMs.toFixed(2)) : null,
        candidates: c.profile?.candidates,
        shiftedMetricsCalls: c.profile?.shiftedMetricsCalls,
        shiftedMetricsMs: c.profile ? Number(c.profile.shiftedMetricsMs.toFixed(2)) : null,
        dilateCalls: c.profile?.dilateCalls,
        dilateCacheHits: c.profile?.dilateCacheHits,
        dilateMs: c.profile ? Number(c.profile.dilateMs.toFixed(2)) : null,
        geometryMs: c.profile ? Number(c.profile.geometryMs.toFixed(2)) : null,
      })),
    }));
  });

  it("reuses unpacked templates across loadGlyphTemplates calls", () => {
    const before = getTemplateLoadStats();
    const a = loadGlyphTemplates(glyphsJson as PackedGlyphFile);
    const b = loadGlyphTemplates(glyphsJson as PackedGlyphFile);
    const after = getTemplateLoadStats();
    expect(a).toBe(b);
    expect(after.unpackCalls).toBe(before.unpackCalls);
    expect(after.loadCacheHits).toBeGreaterThan(before.loadCacheHits);
  });

  it("fast and naive agree on bench cases", () => {
    const templates = getBenchTemplates();
    for (const c of getBenchCases()) {
      const input = {
        ink: c.ink,
        drawing: c.drawing,
        alphabet: c.alphabet,
        expectedRo: c.expectedRo,
        templates,
      };
      const fast = matchInk(input);
      const naive = matchInkUnoptimized(input);
      expect(fast).toEqual(naive);
    }
  });
});
