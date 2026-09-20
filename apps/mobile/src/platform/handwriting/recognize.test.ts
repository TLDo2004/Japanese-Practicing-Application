import { describe, expect, it } from "vitest";
import {
  LOGICAL_PAD,
  displayToLogical,
  logicalToDisplay,
  rasterizeDrawingRgba,
  extractInkFromRgba,
  matchInk,
  loadGlyphTemplates,
  type Drawing,
} from "@jpa/handwriting";
import packedGlyphs from "@jpa/handwriting/templates/glyphs.json";
import { buildDeck } from "@jpa/practice";
import { BASIC } from "@jpa/kana";
import { writingCheckOutcome } from "@jpa/practice";
import { bothAtOnceLogicalKey, oneAtATimeKeys } from "../../lib/bothAtOnce";
import { encodeOpaquePixel, normalizeToRgba } from "./pixelFormat";
import {
  inkFromLogicalDrawingSoftware,
  recognizeDrawingSoftware,
} from "./recognizeCore";

const templates = loadGlyphTemplates(packedGlyphs);

describe("coordinate normalization", () => {
  it("maps display edges to logical 256 consistently for any pad size", () => {
    for (const size of [280, 320, 400]) {
      const drawing: Drawing = [[{ x: 0, y: 0 }, { x: size, y: size }]];
      const logical = displayToLogical(drawing, size, size);
      expect(logical[0]![0]).toEqual({ x: 0, y: 0 });
      expect(logical[0]![1]!.x).toBeCloseTo(LOGICAL_PAD, 5);
      expect(logical[0]![1]!.y).toBeCloseTo(LOGICAL_PAD, 5);
      const back = logicalToDisplay(logical, size, size);
      expect(back[0]![1]!.x).toBeCloseTo(size, 5);
    }
  });
});

describe("pixel format normalization", () => {
  it("decodes BGRA opaque red at known position to RGBA", () => {
    const raw = encodeOpaquePixel(4, 4, 1, 2, "bgra");
    const rgba = normalizeToRgba({ bytes: raw, width: 4, height: 4, layout: "bgra" });
    const i = (2 * 4 + 1) * 4;
    expect([...rgba.slice(i, i + 4)]).toEqual([255, 0, 0, 255]);
  });

  it("keeps RGBA opaque red unchanged", () => {
    const raw = encodeOpaquePixel(2, 2, 0, 0, "rgba");
    const rgba = normalizeToRgba({ bytes: raw, width: 2, height: 2, layout: "rgba" });
    expect([...rgba.slice(0, 4)]).toEqual([255, 0, 0, 255]);
  });
});

describe("reference raster → extract → matchInk", () => {
  it("empty drawing → empty", () => {
    expect(recognizeDrawingSoftware({
      drawing: [],
      alphabet: "hira",
      expectedRo: "a",
      letters: BASIC.slice(0, 5),
    }).status).toBe("empty");
  });

  it("single-point stroke uses shared sparse threshold (empty)", () => {
    const result = recognizeDrawingSoftware({
      drawing: [[{ x: 128, y: 128 }]],
      alphabet: "hira",
      expectedRo: "a",
      letters: BASIC.slice(0, 5),
    });
    expect(result.status).toBe("empty");
  });

  it("guide exclusion: recognition depends only on Drawing", () => {
    const drawing: Drawing = [[
      { x: 40, y: 120 }, { x: 80, y: 80 }, { x: 120, y: 120 }, { x: 160, y: 80 }, { x: 200, y: 120 },
    ]];
    const a = inkFromLogicalDrawingSoftware(drawing);
    const b = inkFromLogicalDrawingSoftware(drawing);
    expect(a?.count).toBe(b?.count);
    expect(a && b && [...a.ink].every((v, i) => v === b.ink[i])).toBe(true);
  });
});

describe("Both-at-once / One-at-a-time", () => {
  it("Both-at-once keeps one logical key; empty+empty does not score ok", () => {
    const deck = buildDeck({ script: "both", letters: BASIC.slice(0, 1), random: false });
    const key = deck[0]!.key;
    expect(bothAtOnceLogicalKey(key, 0)).toBe(key);
    expect(bothAtOnceLogicalKey(key, 1)).toBe(key);
    expect(writingCheckOutcome([{ status: "ok" }, { status: "ok" }])).toBe("ok");
    expect(writingCheckOutcome([{ status: "empty" }, { status: "empty" }])).toBe("empty");
    expect(writingCheckOutcome([{ status: "ok" }, { status: "bad" }])).toBe("bad");
  });

  it("One-at-a-time keeps separate keys", () => {
    const deck = buildDeck({ script: "hira", letters: BASIC.slice(0, 1), random: true });
    expect(deck.map((d) => d.key)).toEqual(oneAtATimeKeys(BASIC[0]!.ro));
  });
});

describe("シ/ツ/ソ/ン geometry path", () => {
  it("passes Drawing into matchInk for kata slant peers", () => {
    const drawing: Drawing = [
      [{ x: 60, y: 70 }, { x: 190, y: 75 }],
      [{ x: 60, y: 120 }, { x: 190, y: 125 }],
      [{ x: 60, y: 170 }, { x: 190, y: 175 }],
    ];
    const { rgba, width, height } = rasterizeDrawingRgba(drawing);
    const ink = extractInkFromRgba(rgba, width, height);
    const result = matchInk({
      ink,
      drawing,
      alphabet: "kata",
      expectedRo: "shi",
      templates,
    });
    expect(result.status === "ok" || result.status === "bad").toBe(true);
    expect(result.status).not.toBe("empty");
  });
});
