import { describe, expect, it } from "vitest";
import { ALL } from "@jpa/kana";
import { CHART_COLUMNS, chartSectionsFor, kanaCellSize, visibleLetterCount } from "./chart";

/** Real device widths in dp, from the narrowest phone we support upward. */
const CONTAINER_WIDTHS = [280, 300, 320, 360, 375, 390, 412, 430, 480, 600, 768, 820, 1024];

const LABEL = 22;
const GAP = 6;
const PADDING = 32; // space[4] on each side of the screen

describe("mobile kana chart layout", () => {
  it("always produces exactly five columns that fit the container", () => {
    for (const containerWidth of CONTAINER_WIDTHS) {
      const sizing = kanaCellSize({
        containerWidth,
        horizontalPadding: 0, // KanaGrid measures the already-padded content box
        labelWidth: LABEL,
        gap: GAP,
      });
      const used = sizing.label + sizing.gap * CHART_COLUMNS + sizing.cell * CHART_COLUMNS;
      expect(sizing.cell, `cell width at ${containerWidth}dp`).toBeGreaterThan(0);
      expect(used, `row width at ${containerWidth}dp`).toBeLessThanOrEqual(containerWidth);
    }
  });

  it("keeps cells tappable on normal phones", () => {
    for (const containerWidth of [360, 375, 390, 412, 430]) {
      const sizing = kanaCellSize({ containerWidth, horizontalPadding: 0, labelWidth: LABEL, gap: GAP });
      expect(sizing.cell, `cell width at ${containerWidth}dp`).toBeGreaterThanOrEqual(44);
    }
  });

  it("gives up gaps, then the row label, before it would drop a column", () => {
    const veryNarrow = kanaCellSize({
      containerWidth: 200,
      horizontalPadding: 0,
      labelWidth: LABEL,
      gap: GAP,
      minCell: 40,
    });
    expect(veryNarrow.gap).toBeLessThanOrEqual(2);
    const used = veryNarrow.label
      + veryNarrow.gap * (veryNarrow.label ? CHART_COLUMNS : CHART_COLUMNS - 1)
      + veryNarrow.cell * CHART_COLUMNS;
    expect(used).toBeLessThanOrEqual(200);
    expect(veryNarrow.cell).toBeGreaterThan(0);
  });

  it("accounts for screen padding when the caller passes it", () => {
    const sizing = kanaCellSize({
      containerWidth: 360,
      horizontalPadding: PADDING,
      labelWidth: LABEL,
      gap: GAP,
    });
    const used = PADDING + sizing.label + sizing.gap * CHART_COLUMNS + sizing.cell * CHART_COLUMNS;
    expect(used).toBeLessThanOrEqual(360);
  });

  it("builds rows that are always CHART_COLUMNS wide, holes included", () => {
    for (const filter of ["basic", "dakuten", "yoon", "all"]) {
      const sections = chartSectionsFor(ALL, filter);
      expect(sections.length).toBeGreaterThan(0);
      sections.forEach((section) => {
        section.rows.forEach((row) => {
          expect(row.cells, `${filter}/${row.id}`).toHaveLength(CHART_COLUMNS);
          expect(row.cells.some(Boolean)).toBe(true);
        });
      });
    }
  });

  it("only the yōon section hides vowel headings", () => {
    const sections = chartSectionsFor(ALL, "all");
    sections.forEach((section) => {
      expect(section.showVowelHeadings).toBe(section.id !== "yoon");
    });
  });

  it("counts visible letters without counting holes", () => {
    const basic = chartSectionsFor(ALL, "basic");
    expect(visibleLetterCount(basic)).toBe(46);
  });
});
