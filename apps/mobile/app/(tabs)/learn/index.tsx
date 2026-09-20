import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { t } from "@jpa/core";
import { ContinueCard, Meter, RowItem, Section } from "../../../src/components/ui";
import { continueDetail, learnContinueState, scriptProgress } from "../../../src/lib/continue";
import { setLabel } from "../../../src/lib/sets";
import { usePlatform } from "../../../src/platform/PlatformContext";
import { useSession } from "../../../src/session/SessionContext";
import { colors, fonts, space } from "../../../src/theme";

const SCRIPTS = [
  { id: "hira", glyph: "あ", nameKey: "hiragana", accent: colors.greenAccent },
  { id: "kata", glyph: "ア", nameKey: "katakana", accent: colors.blueAccent },
] as const;

const EXPLORE = [
  { filter: "basic", mark: "あ", titleKey: "explore_basic", hintKey: "explore_basic_hint", markColor: colors.greenAccent },
  { filter: "dakuten", mark: "が", titleKey: "explore_dakuten", hintKey: "explore_dakuten_hint", markColor: colors.blueAccent },
  { filter: "yoon", mark: "きゃ", titleKey: "explore_yoon", hintKey: "explore_yoon_hint", markColor: colors.violetAccent },
  { filter: "all", mark: "全", titleKey: "explore_all", hintKey: "explore_all_hint", markColor: colors.yellowAccent },
] as const;

export default function LearnScreen() {
  const { store, save } = usePlatform();
  const { continueLast } = useSession();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const live = learnContinueState(store.lastSession) === "live";
  const copy = store.lastSession ? continueDetail(store.lastSession, setLabel) : null;

  const onContinue = () => {
    if (!live) {
      router.push("/chart/hira");
      return;
    }
    const kind = continueLast("learn");
    if (kind === "quiz") router.push("/practice/quiz");
    else if (kind === "write") router.push("/practice/writing");
    else router.push("/chart/hira");
  };

  const openExplore = (filter: string) => {
    save({ chartFilter: filter });
    router.push("/chart/hira");
  };

  return (
    <ScrollView
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + space[6] }]}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.block}>
        <ContinueCard
          title={live ? t("continue_title") : t("start_title")}
          detail={live && copy
            ? t("continue_detail", { title: copy.title, n: copy.seen, total: copy.total })
            : t("start_hint")}
          action={live ? t("continue_resume") : t("start_action")}
          onPress={onContinue}
        />
      </View>

      <Section title={t("section_scripts")}>
        <View>
          {SCRIPTS.map((script) => {
            const progress = scriptProgress(script.id, store.learned);
            return (
              <Pressable
                key={script.id}
                accessibilityRole="button"
                accessibilityLabel={`${t(script.nameKey)}, ${t("learned_of", { n: progress.n, total: progress.total })}`}
                onPress={() => router.push(`/chart/${script.id}`)}
                style={({ pressed }) => [styles.scriptRow, pressed ? styles.pressed : null]}
              >
                <Text style={[styles.scriptGlyph, { color: script.accent }]}>{script.glyph}</Text>
                <View style={styles.scriptBody}>
                  <Text style={styles.scriptName}>{t(script.nameKey)}</Text>
                  <Meter pct={progress.pct} fillColor={script.accent} />
                  <Text style={styles.scriptCount}>
                    {t("learned_of", { n: progress.n, total: progress.total })}
                  </Text>
                </View>
                <Text style={styles.chevron}>›</Text>
              </Pressable>
            );
          })}
        </View>
      </Section>

      <Section title={t("section_explore")}>
        <View>
          {EXPLORE.map((item) => (
            <RowItem
              key={item.filter}
              mark={item.mark}
              markColor={item.markColor}
              title={t(item.titleKey)}
              hint={t(item.hintKey)}
              onPress={() => openExplore(item.filter)}
            />
          ))}
        </View>
      </Section>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: space[4] },
  block: { gap: space[3], marginBottom: space[6] },
  pressed: { backgroundColor: colors.surfaceSubtle },
  scriptRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: space[4],
    paddingVertical: space[3],
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  scriptGlyph: {
    width: 44,
    textAlign: "center",
    fontFamily: fonts.jpMed,
    fontSize: 32,
  },
  scriptBody: { flex: 1, gap: space[2] },
  scriptName: { fontFamily: fonts.bodySemi, fontSize: 15, color: colors.text },
  scriptCount: { fontFamily: fonts.body, fontSize: 13, color: colors.textMuted },
  chevron: { fontFamily: fonts.body, fontSize: 20, color: colors.textMuted },
});
