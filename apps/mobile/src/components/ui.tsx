import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, fonts, radius, space, touch } from "../theme";

export function Eyebrow({ children }: { children: ReactNode }) {
  return <Text style={styles.eyebrow}>{children}</Text>;
}

export function Display({ children }: { children: ReactNode }) {
  return <Text accessibilityRole="header" style={styles.display}>{children}</Text>;
}

export function Muted({ children }: { children: ReactNode }) {
  return <Text style={styles.muted}>{children}</Text>;
}

export function Section({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      {title ? <Eyebrow>{title}</Eyebrow> : null}
      {children}
    </View>
  );
}

export function Meter({ pct, fillColor }: { pct: number; fillColor?: string }) {
  return (
    <View style={styles.meter}>
      <View
        style={[
          styles.meterFill,
          { width: `${Math.max(0, Math.min(100, pct))}%` },
          fillColor ? { backgroundColor: fillColor } : null,
        ]}
      />
    </View>
  );
}

/** A quiet list row: optional kana mark, title, hint, chevron. */
export function RowItem({
  mark,
  markColor,
  title,
  hint,
  onPress,
  accessibilityLabel,
  children,
}: {
  mark?: string;
  markColor?: string;
  title: string;
  hint?: string;
  onPress: () => void;
  accessibilityLabel?: string;
  children?: ReactNode;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || `${title}${hint ? `, ${hint}` : ""}`}
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed ? styles.rowPressed : null]}
    >
      {mark ? <Text style={[styles.rowMark, markColor ? { color: markColor } : null]}>{mark}</Text> : null}
      <View style={styles.rowBody}>
        <Text style={styles.rowTitle}>{title}</Text>
        {hint ? <Text style={styles.rowHint}>{hint}</Text> : null}
        {children}
      </View>
      <Text style={styles.chevron}>›</Text>
    </Pressable>
  );
}

export function ContinueCard({
  title,
  detail,
  action,
  onPress,
}: {
  title: string;
  detail: string;
  action: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${detail}`}
      onPress={onPress}
      style={({ pressed }) => [styles.continue, pressed ? styles.rowPressed : null]}
    >
      <View style={styles.rowBody}>
        <Text style={styles.continueTitle}>{title}</Text>
        <Text style={styles.continueMeta} numberOfLines={1}>{detail}</Text>
      </View>
      <View style={styles.continueAction}>
        <Text style={styles.continueActionText}>{action}</Text>
      </View>
    </Pressable>
  );
}

export function Segmented({
  items,
  value,
  onChange,
  accessibilityLabel,
}: {
  items: Array<{ id: string; label: string }>;
  value: string;
  onChange: (id: string) => void;
  accessibilityLabel: string;
}) {
  return (
    <View style={styles.segmented} accessibilityRole="tablist" accessibilityLabel={accessibilityLabel}>
      {items.map((item) => {
        const active = item.id === value;
        return (
          <Pressable
            key={item.id}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            accessibilityLabel={item.label}
            onPress={() => onChange(item.id)}
            style={[styles.segment, active ? styles.segmentActive : null]}
          >
            <Text style={[styles.segmentText, active ? styles.segmentTextActive : null]}>
              {item.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Chip({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [styles.chip, pressed ? styles.rowPressed : null]}
    >
      <Text style={styles.chipText}>{label}</Text>
    </Pressable>
  );
}

export function Feedback({ text, status }: { text: string; status?: "" | "ok" | "bad" }) {
  return (
    <Text
      accessibilityLiveRegion="polite"
      style={[
        styles.feedback,
        status === "ok" ? styles.feedbackOk : status === "bad" ? styles.feedbackBad : null,
      ]}
    >
      {status === "ok" ? "✓ " : status === "bad" ? "✗ " : ""}
      {text}
    </Text>
  );
}

const styles = StyleSheet.create({
  eyebrow: {
    fontFamily: fonts.bodySemi,
    fontSize: 11,
    letterSpacing: 1.4,
    textTransform: "uppercase",
    color: colors.textMuted,
  },
  display: {
    fontFamily: fonts.display,
    fontSize: 24,
    color: colors.text,
  },
  muted: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.textMuted,
  },
  section: { gap: space[3], marginBottom: space[6] },
  meter: {
    height: 3,
    borderRadius: 2,
    backgroundColor: colors.surfaceSubtle,
    overflow: "hidden",
  },
  meterFill: { height: 3, borderRadius: 2, backgroundColor: colors.primary },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: space[4],
    minHeight: 60,
    paddingVertical: space[3],
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rowPressed: { backgroundColor: colors.surfaceSubtle },
  rowMark: {
    width: 44,
    textAlign: "center",
    fontFamily: fonts.jpMed,
    fontSize: 24,
    color: colors.primary,
  },
  rowBody: { flex: 1, gap: 2 },
  rowTitle: { fontFamily: fonts.bodySemi, fontSize: 15, color: colors.text },
  rowHint: { fontFamily: fonts.body, fontSize: 13, color: colors.textMuted },
  chevron: { fontFamily: fonts.body, fontSize: 20, color: colors.textMuted },
  continue: {
    flexDirection: "row",
    alignItems: "center",
    gap: space[4],
    padding: space[4],
    minHeight: touch + space[4],
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
    borderRadius: radius.md,
  },
  continueTitle: { fontFamily: fonts.bodySemi, fontSize: 16, color: colors.text },
  continueMeta: { fontFamily: fonts.body, fontSize: 13, color: colors.textMuted },
  continueAction: {
    paddingHorizontal: space[4],
    paddingVertical: space[2],
    borderRadius: radius.md,
    backgroundColor: colors.primary,
  },
  continueActionText: { fontFamily: fonts.bodySemi, fontSize: 14, color: colors.onPrimary },
  segmented: {
    flexDirection: "row",
    gap: 2,
    padding: 3,
    borderRadius: 999,
    backgroundColor: colors.surfaceSubtle,
  },
  segment: {
    flex: 1,
    minHeight: 36,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 999,
    paddingHorizontal: space[2],
  },
  segmentActive: { backgroundColor: colors.surface },
  segmentText: { fontFamily: fonts.bodySemi, fontSize: 13, color: colors.textMuted },
  segmentTextActive: { color: colors.text },
  chip: {
    minHeight: 40,
    justifyContent: "center",
    paddingHorizontal: space[4],
    borderRadius: 999,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipText: { fontFamily: fonts.bodyMed, fontSize: 14, color: colors.text },
  feedback: {
    fontFamily: fonts.bodyMed,
    fontSize: 15,
    textAlign: "center",
    color: colors.textMuted,
    minHeight: 22,
  },
  feedbackOk: { color: colors.positive, fontFamily: fonts.bodySemi },
  feedbackBad: { color: colors.primary, fontFamily: fonts.bodySemi },
});
