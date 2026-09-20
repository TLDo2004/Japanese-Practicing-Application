import { describe, expect, it } from "vitest";
import {
  ALL,
  BASIC,
  BASIC_ROWS,
  BY_RO,
  CHART,
  CHART_COLUMNS,
  CHART_VOWELS,
  CONFUSABLE_GROUPS,
  FULL71,
  ROMAJI_ALIASES,
  SET_COUNTS,
  VOICED,
  VOICED_ROWS,
  YOON,
  YOON_ROWS,
  confusablePeers,
  lettersFor,
  matchPeers,
  setLabelKana,
} from "./kana";

describe("@jpa/kana letter-set counts", () => {
  it("has 46 basic letters (あ–ん, including ya/yu/yo/wa/wo/n gaps)", () => {
    expect(BASIC.length).toBe(46);
    expect(SET_COUNTS.basic46).toBe(46);
  });

  it("has 25 voiced/handakuten letters", () => {
    expect(VOICED.length).toBe(25);
    expect(SET_COUNTS.voiced).toBe(25);
  });

  it("has 33 yōon letters", () => {
    expect(YOON.length).toBe(33);
    expect(SET_COUNTS.yoon).toBe(33);
  });

  it("FULL71 is basic + voiced", () => {
    expect(FULL71.length).toBe(71);
    expect(SET_COUNTS.full71).toBe(71);
    expect(FULL71[0]).toEqual({ ro: "a", hira: "あ", kata: "ア" });
    expect(FULL71[46]).toEqual({ ro: "ga", hira: "が", kata: "ガ" });
  });

  it("ALL is FULL71 + yōon", () => {
    expect(ALL.length).toBe(104);
    expect(SET_COUNTS.all).toBe(104);
    expect(ALL[ALL.length - 1]).toEqual({ ro: "pyo", hira: "ぴょ", kata: "ピョ" });
  });
});

describe("row order", () => {
  it("preserves a-row then ka-row hiragana", () => {
    expect(BASIC_ROWS[0].cells.map((c) => c && c.hira)).toEqual(["あ", "い", "う", "え", "お"]);
    expect(BASIC_ROWS[1].cells.map((c) => c && c.hira)).toEqual(["か", "き", "く", "け", "こ"]);
  });

  it("keeps ya/wa/n holes as null", () => {
    expect(BASIC_ROWS[7].cells.map((c) => c && c.ro)).toEqual(["ya", null, "yu", null, "yo"]);
    expect(BASIC_ROWS[9].cells.map((c) => c && c.ro)).toEqual(["wa", null, null, null, "wo"]);
    expect(BASIC_ROWS[10].cells.map((c) => c && c.ro)).toEqual(["n", null, null, null, null]);
  });

  it("uses dji/dzu romaji for ぢ/づ", () => {
    const da = VOICED_ROWS[2].cells;
    expect(da[1]).toEqual({ ro: "dji", hira: "ぢ", kata: "ヂ" });
    expect(da[2]).toEqual({ ro: "dzu", hira: "づ", kata: "ヅ" });
  });

  it("chart sections are basic, dakuten, yoon", () => {
    expect(CHART.map((s) => s.id)).toEqual(["basic", "dakuten", "yoon"]);
    expect(YOON_ROWS[0].id).toBe("yoon-k");
  });

  it("every chart row has exactly CHART_COLUMNS cell slots", () => {
    expect(CHART_COLUMNS).toBe(5);
    expect(CHART_VOWELS).toEqual(["a", "i", "u", "e", "o"]);
    CHART.forEach((section) => {
      section.rows.forEach((row) => {
        expect(row.cells).toHaveLength(CHART_COLUMNS);
      });
    });
  });
});

describe("lettersFor", () => {
  it("returns array copies, not cloned letter objects", () => {
    expect(lettersFor("basic46").map((l) => l.ro)).toEqual(BASIC.map((l) => l.ro));
    const allCopy = lettersFor("all");
    expect(allCopy).not.toBe(ALL);
    expect(allCopy[0]).toBe(ALL[0]);
  });

  it("lookalikes follows ALL order, single-mora confusable only", () => {
    expect(lettersFor("lookalikes").map((l) => l.ro)).toEqual([
      "shi", "so", "tsu", "nu", "ne", "ha", "ho", "ma", "me", "yo", "ru", "re", "ro", "wa", "n",
    ]);
  });

  it("row ids use BASIC+VOICED map only", () => {
    expect(lettersFor("a").map((l) => l.ro)).toEqual(["a", "i", "u", "e", "o"]);
    expect(lettersFor("ga").map((l) => l.hira)).toEqual(["が", "ぎ", "ぐ", "げ", "ご"]);
  });

  it("unknown set ids and yōon row ids fall back to FULL71", () => {
    expect(lettersFor("nope").length).toBe(71);
    expect(lettersFor("yoon-k").length).toBe(71);
  });
});

describe("lookalikes and peers", () => {
  it("keeps confusable groups from legacy", () => {
    expect(CONFUSABLE_GROUPS).toEqual([
      ["me", "nu"],
      ["ne", "re", "wa"],
      ["ru", "ro"],
      ["ha", "ho"],
      ["yo", "ma"],
      ["shi", "tsu"],
      ["so", "n"],
    ]);
    expect(confusablePeers("me")).toEqual(["nu"]);
    expect(confusablePeers("a")).toEqual([]);
  });

  it("matchPeers unions overlapping groups in insertion order", () => {
    expect(matchPeers("shi")).toEqual(["tsu", "so", "n"]);
    expect(matchPeers("n")).toEqual(["so", "shi", "tsu"]);
    expect(matchPeers("fu")).toEqual(["wa", "u", "ra"]);
  });
});

describe("aliases", () => {
  it("includes kunrei and dji/dzu/wo special cases", () => {
    expect(ROMAJI_ALIASES.shi).toEqual(["si"]);
    expect(ROMAJI_ALIASES.dji).toEqual(["di", "ji"]);
    expect(ROMAJI_ALIASES.dzu).toEqual(["du", "zu"]);
    expect(ROMAJI_ALIASES.wo).toEqual(["o"]);
    expect(ROMAJI_ALIASES.cha).toEqual(["tya", "cya"]);
  });

  it("indexes BY_RO by canonical romaji", () => {
    expect(BY_RO.dji.hira).toBe("ぢ");
    expect(BY_RO.wo.kata).toBe("ヲ");
  });
});

describe("setLabelKana", () => {
  it("pulls kana from the English title, or the row id", () => {
    expect(setLabelKana(BASIC_ROWS[0])).toBe("あ");
    expect(setLabelKana(BASIC_ROWS[10])).toBe("ん");
  });
});
