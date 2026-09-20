import { useState } from "react";
import { LayoutChangeEvent, Pressable, StyleSheet, Text, View } from "react-native";
import { t } from "@jpa/core";
import type { Letter } from "@jpa/kana";
import {
  CHART_COLUMNS,
  CHART_VOWELS,
  cellGlyph,
  kanaCellSize,
  type ChartSectionView,
} from "../lib/chart";
import { colors, fonts, radius, space, touch } from "../theme";

const LABEL_WIDTH = 22;
const GAP = 6;

type Props = {
  sections: ChartSectionView[];
  script: string;
  /** Horizontal padding already applied by the screen around this grid. */
  horizontalPadding?: number;
  learnedRos?: ReadonlySet<string>;
  usedRos?: ReadonlySet<string>;
  currentRo?: string;
  onPick?: (letter: Letter) => void;
};

/**
 * Five columns, always.
 *
 * Cell width is computed from the measured container width rather than left to
 * flex wrapping, so the fifth character can never be pushed onto a second line
 * or clipped. See `kanaCellSize` for the arithmetic.
 */
export function KanaGrid({
  sections,
  script,
  horizontalPadding = 0,
  learnedRos,
  usedRos,
  currentRo,
  onPick,
}: Props) {
  const [width, setWidth] = useState(0);

  const onLayout = (event: LayoutChangeEvent) => {
    const next = event.nativeEvent.layout.width;
    if (next > 0 && Math.abs(next - width) > 0.5) setWidth(next);
  };

  const sizing = kanaCellSize({
    containerWidth: width,
    horizontalPadding,
    labelWidth: LABEL_WIDTH,
    gap: GAP,
  });

  return (
    <View onLayout={onLayout}>
      {width <= 0 ? null : sections.map((section) => (
        <View key={section.id} style={styles.section}>
          <Text style={styles.sectionTitle}>{t(section.titleKey)}</Text>

          {section.showVowelHeadings ? (
            <View style={[styles.row, { gap: sizing.gap }]} accessibilityElementsHidden>
              <View style={{ width: sizing.label }} />
              {CHART_VOWELS.map((vowel) => (
                <View key={vowel} style={{ width: sizing.cell }}>
                  <Text style={styles.colLabel}>{vowel}</Text>
                </View>
              ))}
            </View>
          ) : null}

          {section.rows.map((row) => (
            <View key={row.id} style={[styles.row, { gap: sizing.gap }]}>
              <Text style={[styles.rowLabel, { width: sizing.label }]}>{row.label}</Text>
              {row.cells.map((letter, index) => {
                if (!letter) {
                  return (
                    <View
                      key={`${row.id}-gap-${index}`}
                      style={{ width: sizing.cell, height: touch }}
                    />
                  );
                }
                const glyph = cellGlyph(letter, script);
                const learned = !!learnedRos?.has(letter.ro);
                const used = !!usedRos?.has(letter.ro);
                const current = currentRo === letter.ro;
                return (
                  <Pressable
                    key={`${row.id}-${letter.ro}`}
                    accessibilityRole={onPick ? "button" : "text"}
                    accessibilityLabel={learned
                      ? `${glyph}, ${letter.ro}, ${t("learned")}`
                      : `${glyph}, ${letter.ro}`}
                    onPress={onPick ? () => onPick(letter) : undefined}
                    style={({ pressed }) => [
                      styles.cell,
                      { width: sizing.cell },
                      learned ? styles.cellLearned : null,
                      current ? styles.cellCurrent : null,
                      pressed ? styles.cellPressed : null,
                    ]}
                  >
                    {learned ? <View style={styles.learnedDot} /> : null}
                    <Text
                      numberOfLines={1}
                      adjustsFontSizeToFit
                      style={[
                        styles.glyph,
                        glyph.length > 1 ? styles.glyphCombo : null,
                        used ? styles.faded : null,
                      ]}
                    >
                      {glyph}
                    </Text>
                    <Text
                      numberOfLines={1}
                      style={[styles.ro, used ? styles.faded : null]}
                    >
                      {letter.ro}
                    </Text>
                    {used ? <View style={styles.usedLine} /> : null}
                  </Pressable>
                );
              })}
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginBottom: space[5] },
  sectionTitle: {
    fontFamily: fonts.bodySemi,
    fontSize: 11,
    letterSpacing: 1.4,
    textTransform: "uppercase",
    color: colors.textMuted,
    marginBottom: space[2],
  },
  row: { flexDirection: "row", alignItems: "stretch", marginBottom: GAP },
  colLabel: {
    fontFamily: fonts.bodySemi,
    fontSize: 10,
    letterSpacing: 1,
    textTransform: "uppercase",
    textAlign: "center",
    color: colors.textMuted,
    marginBottom: space[1],
  },
  rowLabel: {
    fontFamily: fonts.jp,
    fontSize: 13,
    color: colors.textMuted,
    textAlign: "center",
    alignSelf: "center",
  },
  cell: {
    minHeight: touch,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: space[2],
    paddingHorizontal: 2,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    overflow: "hidden",
  },
  cellLearned: { backgroundColor: colors.surfaceSubtle, borderColor: colors.borderStrong },
  cellCurrent: { borderColor: colors.primary, borderWidth: 2 },
  cellPressed: { backgroundColor: colors.surfaceSubtle },
  learnedDot: {
    position: "absolute",
    top: 4,
    right: 4,
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.primary,
  },
  glyph: { fontFamily: fonts.jpMed, fontSize: 22, color: colors.text, includeFontPadding: false },
  glyphCombo: { fontSize: 16 },
  ro: { fontFamily: fonts.body, fontSize: 10, color: colors.textMuted, marginTop: 2 },
  faded: { opacity: 0.4 },
  usedLine: {
    position: "absolute",
    left: 6,
    right: 6,
    top: "50%",
    height: 1,
    backgroundColor: colors.borderStrong,
  },
});

export { CHART_COLUMNS };
