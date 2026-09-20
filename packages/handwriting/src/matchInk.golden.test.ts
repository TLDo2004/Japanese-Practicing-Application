import { describe, expect, it } from "vitest";
import glyphsJson from "../templates/glyphs.json" with { type: "json" };
import fixturesJson from "../templates/fixtures.json" with { type: "json" };
import { matchInk } from "./matchInk";
import { loadGlyphTemplates, unpackInk, type PackedGlyphFile, type PackedInk } from "./templates";
import type { Alphabet, Drawing, MatchResult } from "./types";
import { INK_ALPHA_THRESHOLD, MASK_SIZE } from "./constants";
import { RASTER_SPEC } from "./raster-spec";

type Fixture = {
  id: string;
  alphabet: Alphabet;
  expectedRo: string;
  drawing: Drawing;
  ink: PackedInk | null;
  legacy: MatchResult;
};

const glyphs = glyphsJson as PackedGlyphFile;
const fixtures = (fixturesJson as { fixtures: Fixture[] }).fixtures;
const templates = loadGlyphTemplates(glyphs);

function run(fixture: Fixture): MatchResult {
  return matchInk({
    ink: fixture.ink ? unpackInk(fixture.ink) : null,
    drawing: fixture.drawing,
    alphabet: fixture.alphabet,
    expectedRo: fixture.expectedRo,
    templates,
  });
}

function byId(id: string): Fixture {
  const found = fixtures.find((f) => f.id === id);
  if (!found) throw new Error(`missing fixture ${id}`);
  return found;
}

function expectParity(fixture: Fixture) {
  const got = run(fixture);
  expect(got.status).toBe(fixture.legacy.status);
  if (got.status === "empty") return;
  if (fixture.legacy.status === "empty") return;
  expect(got.best.ro).toBe(fixture.legacy.best.ro);
  expect(got.best.ch).toBe(fixture.legacy.best.ch);
  expect(got.expectedScore).toBeCloseTo(fixture.legacy.expectedScore, 10);
  expect(got.best.score).toBeCloseTo(fixture.legacy.best.score, 10);
}

describe("oracle glyph templates", () => {
  it("contains ALL letters from the Chromium legacy generator", () => {
    expect(glyphs.hira).toHaveLength(104);
    expect(glyphs.kata).toHaveLength(104);
    expect(glyphs.maskSize).toBe(MASK_SIZE);
    expect(glyphs.fontFamily).toBe(RASTER_SPEC.templateFontFamily);
    expect(templates.hira[0]?.mask).toHaveLength(MASK_SIZE * MASK_SIZE);
  });
});

describe("golden fixtures vs legacy matchPad", () => {
  it("has oracle-captured fixtures", () => {
    expect(fixtures.length).toBeGreaterThanOrEqual(20);
  });

  for (const fixture of fixtures) {
    it(`parity: ${fixture.id}`, () => {
      expectParity(fixture);
    });
  }
});

describe("empty and boundary rasters", () => {
  it("empty canvas is empty", () => {
    expect(byId("empty-256").legacy.status).toBe("empty");
    expectParity(byId("empty-256"));
  });

  it("marks below the 256×256 empty threshold stay empty", () => {
    expect(byId("tiny-100px").legacy.status).toBe("empty");
    expect(byId("borderline-262px").legacy.status).toBe("empty");
    expect(byId("borderline-263px").legacy.status).toBe("bad");
    expectParity(byId("tiny-100px"));
    expectParity(byId("borderline-262px"));
    expectParity(byId("borderline-263px"));
  });

  it("a single-point stroke is empty on a 256 pad", () => {
    expect(byId("single-point-stroke").legacy.status).toBe("empty");
    expectParity(byId("single-point-stroke"));
  });
});

describe("hiragana glyph samples", () => {
  it("accepts obvious あ/い/し and yōon きゃ", () => {
    expect(byId("hira-a-glyph-ok").legacy.status).toBe("ok");
    expect(byId("hira-i-glyph-ok").legacy.status).toBe("ok");
    expect(byId("hira-shi-glyph-ok").legacy.status).toBe("ok");
    expect(byId("hira-kya-combo-ok").legacy.status).toBe("ok");
  });

  it("rejects あ when the expected letter is い", () => {
    expect(byId("hira-a-glyph-expect-i").legacy.status).toBe("bad");
    expectParity(byId("hira-a-glyph-expect-i"));
  });
});

describe("katakana シ / ツ / ソ / ン", () => {
  it("accepts Noto glyph rasters for シツソン", () => {
    expect(byId("kata-shi-glyph-ok").legacy.status).toBe("ok");
    expect(byId("kata-tsu-glyph-ok").legacy.status).toBe("ok");
    expect(byId("kata-so-glyph-ok").legacy.status).toBe("ok");
    expect(byId("kata-n-glyph-ok").legacy.status).toBe("ok");
    expectParity(byId("kata-shi-glyph-ok"));
    expectParity(byId("kata-tsu-glyph-ok"));
    expectParity(byId("kata-so-glyph-ok"));
    expectParity(byId("kata-n-glyph-ok"));
  });

  it("does not accept the peer character as the expected letter", () => {
    expect(byId("kata-shi-glyph-expect-tsu").legacy.status).toBe("bad");
    expect(byId("kata-tsu-glyph-expect-shi").legacy.status).toBe("bad");
    expect(byId("kata-so-glyph-expect-n").legacy.status).toBe("bad");
    expect(byId("kata-n-glyph-expect-so").legacy.status).toBe("bad");
    const shiAsTsu = byId("kata-shi-glyph-expect-tsu").legacy;
    const tsuAsShi = byId("kata-tsu-glyph-expect-shi").legacy;
    if (shiAsTsu.status !== "empty") expect(shiAsTsu.best.ro).toBe("shi");
    if (tsuAsShi.status !== "empty") expect(tsuAsShi.best.ro).toBe("tsu");
    expectParity(byId("kata-shi-glyph-expect-tsu"));
    expectParity(byId("kata-tsu-glyph-expect-shi"));
    expectParity(byId("kata-so-glyph-expect-n"));
    expectParity(byId("kata-n-glyph-expect-so"));
  });

  it("records synthetic stroke drawings as the legacy verdict (currently not accepted)", () => {
    expect(byId("kata-shi-horizontal-strokes").legacy.status).toBe("bad");
    expect(byId("kata-tsu-vertical-strokes").legacy.status).toBe("bad");
    expectParity(byId("kata-shi-horizontal-strokes"));
    expectParity(byId("kata-tsu-vertical-strokes"));
    expectParity(byId("kata-so-vertical-strokes"));
    expectParity(byId("kata-n-horizontal-strokes"));
  });
});

describe("performance", () => {
  it("reuses loaded templates and stays interactive for a glyph check", () => {
    const fixture = byId("hira-a-glyph-ok");
    const start = Date.now();
    for (let i = 0; i < 25; i++) run(fixture);
    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(4000);
    expect(INK_ALPHA_THRESHOLD).toBe(24);
  });
});
