import { describe, expect, it } from "vitest";
import { matchInk, matchInkUnoptimized, loadGlyphTemplates, type Drawing } from "@jpa/handwriting";
import packedGlyphs from "@jpa/handwriting/templates/glyphs.json";
import captured from "./androidCapturedFixtures.json";
import { inkFromLogicalDrawingSoftware } from "./recognizeCore";

const templates = loadGlyphTemplates(packedGlyphs);

describe("Android captured Drawing fixtures", () => {
  it("has curated device captures", () => {
    expect(captured.device).toBe("CPH2873");
    expect(captured.fixtures.length).toBeGreaterThan(0);
  });

  for (const fixture of captured.fixtures) {
    it(`fast ≡ naive: ${fixture.id}`, () => {
      const drawing = fixture.drawing as Drawing;
      const ink = inkFromLogicalDrawingSoftware(drawing);
      const input = {
        ink,
        drawing,
        alphabet: fixture.alphabet as "hira" | "kata",
        expectedRo: fixture.expectedRo,
        templates,
      };
      const fast = matchInk(input);
      const naive = matchInkUnoptimized(input);
      expect(fast.status).toBe(naive.status);
      if (fast.status === "empty" || naive.status === "empty") return;
      expect(fast.best.ro).toBe(naive.best.ro);
      expect(fast.expectedScore).toBe(naive.expectedScore);
    });
  }
});
