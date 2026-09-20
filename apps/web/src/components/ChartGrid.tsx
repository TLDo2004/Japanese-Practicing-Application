import type { KeyboardEvent } from "react";
import type { Letter } from "@jpa/kana";
import { t } from "@jpa/core";
import { cellGlyph, CHART_VOWELS, type ChartSectionView } from "../lib/chart";

type ChartGridProps = {
  sections: ChartSectionView[];
  script: string;
  clickable?: boolean;
  currentRo?: string;
  usedRos?: ReadonlySet<string>;
  learnedRos?: ReadonlySet<string>;
  onPick?: (letter: Letter) => void;
};

/**
 * A study table, not a deck of cards.
 *
 * Each gojūon row is its own CSS grid of `[label] + 5 equal columns`, so the
 * fifth character always sits on the same visual line as the first four at
 * every viewport width. See `.kana-row` in styles.css.
 */
export function ChartGrid({
  sections,
  script,
  clickable = false,
  currentRo,
  usedRos,
  learnedRos,
  onPick,
}: ChartGridProps) {
  const onKey = (letter: Letter, event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onPick?.(letter);
    }
  };

  return (
    <div>
      {sections.map((section) => (
        <section className="chart-section" key={section.id}>
          <h2 className="chart-section-title">{t(section.titleKey)}</h2>
          <div className="kana-grid" role="presentation">
            {section.showVowelHeadings ? (
              <div className="kana-row kana-head" aria-hidden="true">
                <span />
                {CHART_VOWELS.map((vowel) => (
                  <span className="kana-col-label" key={vowel}>{vowel}</span>
                ))}
              </div>
            ) : null}
            {section.rows.map((row) => (
              <div className="kana-row" key={row.id}>
                <span className="kana-row-label" aria-hidden="true">{row.label}</span>
                {row.cells.map((letter, index) => {
                  if (!letter) {
                    return <div className="kana-cell is-blank" key={`${row.id}-gap-${index}`} />;
                  }
                  const glyph = cellGlyph(letter, script);
                  const learned = learnedRos?.has(letter.ro);
                  const className = [
                    "kana-cell",
                    learned ? "is-learned" : "",
                    usedRos?.has(letter.ro) ? "is-used" : "",
                    currentRo === letter.ro ? "is-current" : "",
                    letter.hira.length > 1 ? "is-combo" : "",
                  ].filter(Boolean).join(" ");
                  const label = learned
                    ? `${glyph}, ${letter.ro}, ${t("learned")}`
                    : `${glyph}, ${letter.ro}`;
                  return (
                    <div
                      key={`${row.id}-${letter.ro}`}
                      className={className}
                      role={clickable ? "button" : undefined}
                      aria-label={clickable ? label : undefined}
                      tabIndex={clickable ? 0 : undefined}
                      onClick={clickable ? () => onPick?.(letter) : undefined}
                      onKeyDown={clickable ? (event) => onKey(letter, event) : undefined}
                    >
                      <span className="kana-cell-glyph">{glyph}</span>
                      <span className="kana-cell-ro">{letter.ro}</span>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
