import { describe, expect, it } from "vitest";
import { ALL, BASIC_ROWS } from "@jpa/kana";
import { CHART_COLUMNS, CHART_VOWELS, cellGlyph, chartSectionsFor, visibleLetterCount } from "./chart";

describe("web kana chart view model", () => {
  it("returns rows that are always five cells wide, holes included", () => {
    for (const filter of ["basic", "dakuten", "yoon", "all"]) {
      const sections = chartSectionsFor(ALL, filter);
      expect(sections.length, filter).toBeGreaterThan(0);
      sections.forEach((section) => {
        section.rows.forEach((row) => {
          expect(row.cells, `${filter}/${row.id}`).toHaveLength(CHART_COLUMNS);
        });
      });
    }
  });

  it("keeps gojūon rows in a i u e o order", () => {
    const basic = chartSectionsFor(ALL, "basic");
    const kaRow = basic[0].rows.find((row) => row.id === "ka");
    expect(kaRow?.cells.map((cell) => cell?.ro)).toEqual(["ka", "ki", "ku", "ke", "ko"]);
    expect(CHART_VOWELS).toEqual(["a", "i", "u", "e", "o"]);
  });

  it("drops rows with no visible letters but never trims a row to fewer columns", () => {
    const letters = ALL.filter((letter) => letter.ro === "ka");
    const sections = chartSectionsFor(letters, "basic");
    expect(sections).toHaveLength(1);
    expect(sections[0].rows).toHaveLength(1);
    expect(sections[0].rows[0].cells).toHaveLength(CHART_COLUMNS);
    expect(sections[0].rows[0].cells.filter(Boolean)).toHaveLength(1);
  });

  it("labels each row with its first kana", () => {
    const basic = chartSectionsFor(ALL, "basic");
    const ids = basic[0].rows.map((row) => row.id);
    expect(ids).toEqual(BASIC_ROWS.map((row) => row.id));
    expect(basic[0].rows[0].label).toBe("あ");
  });

  it("hides vowel headings only for yōon", () => {
    chartSectionsFor(ALL, "all").forEach((section) => {
      expect(section.showVowelHeadings).toBe(section.id !== "yoon");
    });
  });

  it("counts only real letters", () => {
    expect(visibleLetterCount(chartSectionsFor(ALL, "basic"))).toBe(46);
  });

  it("renders the requested script", () => {
    const a = ALL.find((letter) => letter.ro === "a")!;
    expect(cellGlyph(a, "hira")).toBe("あ");
    expect(cellGlyph(a, "kata")).toBe("ア");
  });
});
