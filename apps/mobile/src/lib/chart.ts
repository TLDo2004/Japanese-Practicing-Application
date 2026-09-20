import { CHART, CHART_COLUMNS, CHART_VOWELS, setLabelKana, type Letter } from "@jpa/kana";

export type ChartFilter = "basic" | "dakuten" | "yoon" | "all";

export type ChartRowView = {
  id: string;
  label: string;
  /** Always CHART_COLUMNS long; holes stay null so the five columns stay aligned. */
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
      rows: section.rows
        .map((row) => ({
          id: row.id,
          label: setLabelKana(row),
          cells: row.cells.map((cell) => (cell && set.has(cell.ro) ? cell : null)),
        }))
        .filter((row) => row.cells.some(Boolean)),
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

/**
 * Deterministic five-column sizing for React Native.
 *
 * Width is measured, never inferred from flex wrapping: the label column, the
 * gaps and the container padding are subtracted first, and whatever is left is
 * divided into exactly CHART_COLUMNS cells. `Math.floor` keeps the total under
 * the measured width so the fifth cell can never be pushed to a second line.
 */
export function kanaCellSize(input: {
  containerWidth: number;
  horizontalPadding: number;
  labelWidth: number;
  gap: number;
  minCell?: number;
}): { cell: number; label: number; gap: number } {
  const gap = Math.max(0, input.gap);
  const minCell = input.minCell ?? 28;
  const gapCount = CHART_COLUMNS; // label→cell1 plus the four gaps between cells
  const available = input.containerWidth - input.horizontalPadding - input.labelWidth - gap * gapCount;
  const cell = Math.floor(available / CHART_COLUMNS);
  if (cell >= minCell) return { cell, label: input.labelWidth, gap };

  // Very narrow devices: give up the gaps first, then the label column, rather
  // than ever dropping a column.
  const tightGap = Math.max(0, Math.min(gap, 2));
  const withTightGap = Math.floor(
    (input.containerWidth - input.horizontalPadding - input.labelWidth - tightGap * gapCount) / CHART_COLUMNS,
  );
  if (withTightGap >= minCell) return { cell: withTightGap, label: input.labelWidth, gap: tightGap };

  const noLabel = Math.floor(
    (input.containerWidth - input.horizontalPadding - tightGap * (CHART_COLUMNS - 1)) / CHART_COLUMNS,
  );
  return { cell: Math.max(1, noLabel), label: 0, gap: tightGap };
}
