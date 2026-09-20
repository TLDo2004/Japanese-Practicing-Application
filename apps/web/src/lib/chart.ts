import { CHART, CHART_COLUMNS, CHART_VOWELS, setLabelKana, type Letter } from "@jpa/kana";

export type ChartFilter = "basic" | "dakuten" | "yoon" | "all";

export type ChartRowView = {
  id: string;
  label: string;
  /** Always CHART_COLUMNS long; holes are null so the five columns stay aligned. */
  cells: Array<Letter | null>;
};

export type ChartSectionView = {
  id: string;
  titleKey: string;
  /** Yōon rows are compounds, not a/i/u/e/o, so they get no vowel headings. */
  showVowelHeadings: boolean;
  rows: ChartRowView[];
};

export { CHART_COLUMNS, CHART_VOWELS };

export function chartSectionsFor(
  letters: readonly Letter[],
  filter: string,
): ChartSectionView[] {
  const set = new Set(letters.map((l) => l.ro));
  return CHART
    .filter((section) => filter === "all" || section.id === filter)
    .map((section) => ({
      id: section.id,
      titleKey: section.titleKey,
      showVowelHeadings: section.id !== "yoon",
      rows: section.rows.map((row) => ({
        id: row.id,
        label: setLabelKana(row),
        cells: row.cells.map((cell) => (cell && set.has(cell.ro) ? cell : null)),
      })),
    }))
    .map((section) => ({
      ...section,
      rows: section.rows.filter((row) => row.cells.some(Boolean)),
    }))
    .filter((section) => section.rows.length > 0);
}

export function visibleLetterCount(sections: readonly ChartSectionView[]): number {
  return sections.reduce(
    (n, section) => n + section.rows.reduce((m, row) => m + row.cells.filter(Boolean).length, 0),
    0,
  );
}

export function cellGlyph(letter: Letter, script: string): string {
  if (script === "kata") return letter.kata;
  if (script === "both") return `${letter.hira} ${letter.kata}`;
  return letter.hira;
}
