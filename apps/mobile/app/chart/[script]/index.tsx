import { useLayoutEffect, useMemo } from "react";
import { ScrollView, StyleSheet, Text } from "react-native";
import { Redirect, useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import { ALL, type Letter } from "@jpa/kana";
import { t } from "@jpa/core";
import { KanaGrid } from "../../../src/components/KanaGrid";
import { Segmented } from "../../../src/components/ui";
import { chartSectionsFor, visibleLetterCount } from "../../../src/lib/chart";
import { usePlatform } from "../../../src/platform/PlatformContext";
import { colors, fonts, space } from "../../../src/theme";

const FILTERS = [
  { id: "basic", key: "filter_basic" },
  { id: "dakuten", key: "filter_dakuten" },
  { id: "yoon", key: "filter_yoon" },
  { id: "all", key: "filter_all" },
] as const;

const PADDING = space[4];

export default function ChartScreen() {
  const { script: scriptParam } = useLocalSearchParams<{ script: string }>();
  const script = scriptParam === "kata" ? "kata" : scriptParam === "hira" ? "hira" : null;
  const { store, save } = usePlatform();
  const router = useRouter();
  const navigation = useNavigation();
  const filter = store.chartFilter || "basic";
  const sections = useMemo(() => chartSectionsFor(ALL, filter), [filter]);
  const count = visibleLetterCount(sections);

  const learnedRos = useMemo(() => {
    const prefix = `${script}:`;
    return new Set(
      Object.keys(store.learned)
        .filter((key) => store.learned[key] && key.startsWith(prefix))
        .map((key) => key.slice(prefix.length)),
    );
  }, [store.learned, script]);

  useLayoutEffect(() => {
    navigation.setOptions({
      title: script === "kata" ? t("title_kata_chart") : t("title_hira_chart"),
      headerRight: () => <Text style={styles.count}>{t("chart_count", { n: count })}</Text>,
    });
  }, [navigation, script, count]);

  if (!script) return <Redirect href="/(tabs)/learn" />;

  const onPick = (letter: Letter) => {
    router.push(`/chart/${script}/${letter.ro}`);
  };

  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={styles.note}>{t("chart_note")}</Text>
      <Segmented
        items={FILTERS.map((item) => ({ id: item.id, label: t(item.key) }))}
        value={filter}
        onChange={(id) => save({ chartFilter: id })}
        accessibilityLabel={t("filter_label")}
      />
      <KanaGrid
        sections={sections}
        script={script}
        learnedRos={learnedRos}
        onPick={onPick}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: PADDING, gap: space[4], paddingBottom: space[7] },
  note: { fontFamily: fonts.body, color: colors.textMuted, fontSize: 14 },
  count: { fontFamily: fonts.bodyMed, color: colors.textMuted, marginRight: space[3], fontSize: 13 },
});
