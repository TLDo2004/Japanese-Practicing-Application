import { describe, expect, it } from "vitest";
import { writingCheckOutcome, recordAttempt, learnedScriptsForPrompt } from "@jpa/practice";
import { extractInkFromRgba, matchInk, loadGlyphTemplates } from "@jpa/handwriting";
import packed from "@jpa/handwriting/templates/glyphs.json";
import { templatesForLetters } from "./recognize";
import { measurePackedGlyphLatency } from "./latency";
import { verdictFromMatch } from "./verdict";
import { ALL, lettersFor } from "@jpa/kana";

describe("both-at-once recognition scoring", () => {
  it("records a single key for two script pads", () => {
    const judged = writingCheckOutcome([{ status: "ok" }, { status: "bad" }]);
    const results = recordAttempt({}, "shi", judged === "ok");
    expect(Object.keys(results)).toEqual(["shi"]);
    expect(learnedScriptsForPrompt("both", "both")).toEqual(["hira", "kata"]);
  });
});

describe("canvas-neutral extract + matchInk", () => {
  it("empty pixels yield empty, glyph templates stay filtered not rebuilt", () => {
    const rgba = new Uint8ClampedArray(4);
    expect(extractInkFromRgba(rgba, 1, 1)).toBeNull();
    const row = lettersFor("a");
    const subset = templatesForLetters(row);
    expect(subset.hira.length).toBe(row.length);
    expect(subset.hira.every((g) => row.some((l) => l.ro === g.ro))).toBe(true);
  });

  it("matches a packed あ template against itself as ok", () => {
    const templates = loadGlyphTemplates(packed);
    const glyph = templates.hira.find((g) => g.ro === "a");
    expect(glyph).toBeTruthy();
    const n = 56;
    const ink = new Uint8Array(n * n);
    ink.set(glyph!.mask);
    let count = 0;
    let minX = n;
    let minY = n;
    let maxX = -1;
    let maxY = -1;
    for (let y = 0; y < n; y++) {
      for (let x = 0; x < n; x++) {
        if (!ink[y * n + x]) continue;
        count++;
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
    const result = matchInk({
      ink: { ink, w: n, h: n, minX, minY, maxX, maxY, count },
      drawing: [],
      alphabet: "hira",
      expectedRo: "a",
      templates: templatesForLetters(ALL),
    });
    expect(result.status).toBe("ok");
    const v = verdictFromMatch(result, "a", (key) => key);
    expect(v).toEqual({ status: "ok", text: "correct" });
  });

  it("records representative packed-glyph matchInk latency", () => {
    const stats = measurePackedGlyphLatency(5);
    expect(stats.samples).toBeGreaterThan(0);
    expect(stats.median).toBeGreaterThanOrEqual(0);
    expect(stats.worst).toBeGreaterThanOrEqual(stats.median);
    expect(stats.labels).toEqual(["hira:a", "kata:a", "hira:kya", "kata:shi", "kata:tsu", "kata:so", "kata:n"]);
  });
});
