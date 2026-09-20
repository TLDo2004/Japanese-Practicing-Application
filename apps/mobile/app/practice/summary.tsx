import { useLayoutEffect } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { Redirect, useNavigation, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { t } from "@jpa/core";
import { AppButton } from "../../src/components/AppButton";
import { Display, Eyebrow, Muted } from "../../src/components/ui";
import { currentPrompt, useSession } from "../../src/session/SessionContext";
import { colors, fonts, radius, space } from "../../src/theme";

export default function SummaryScreen() {
  const { session, summary, retrySummary, practiceMissed, clearSession } = useSession();
  const router = useRouter();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const data = summary();

  useLayoutEffect(() => {
    navigation.setOptions({ title: t("summary") });
  }, [navigation]);

  if (!session || !data) {
    return <Redirect href="/(tabs)/practice" />;
  }

  return (
    <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + space[6] }]}>
      <View style={styles.head}>
        <Display>{t("summary_title")}</Display>
        <Text style={styles.score}>
          {data.accuracy}
          <Text style={styles.scoreUnit}>%</Text>
        </Text>
        <Text style={styles.line}>{data.stats}</Text>
      </View>

      <View style={styles.block}>
        <Eyebrow>{data.missed.length ? t("to_review") : t("nothing_to_review")}</Eyebrow>
        {data.missed.length ? (
          <View style={styles.strip}>
            {data.missed.map((item) => {
              const prompt = currentPrompt(session, item);
              const kana = prompt === "kata"
                ? item.kata
                : prompt === "hira"
                  ? item.hira
                  : `${item.hira} ${item.kata}`;
              return (
                <View key={item.key} style={styles.reviewItem} accessibilityLabel={`${kana}, ${item.ro}`}>
                  <Text style={styles.reviewGlyph}>{kana}</Text>
                  <Text style={styles.reviewRo}>{item.ro}</Text>
                </View>
              );
            })}
          </View>
        ) : (
          <Muted>{t("summary_empty")}</Muted>
        )}
      </View>

      <View style={styles.actions}>
        {data.missed.length ? (
          <AppButton
            label={t("practice_missed")}
            onPress={() => {
              const kind = practiceMissed();
              if (kind === "quiz") router.replace("/practice/quiz");
              else if (kind === "write") router.replace("/practice/writing");
            }}
          />
        ) : null}
        <AppButton
          label={t("practice_again")}
          variant="secondary"
          onPress={() => {
            const kind = retrySummary();
            if (kind === "quiz") router.replace("/practice/quiz");
            else if (kind === "write") router.replace("/practice/writing");
          }}
        />
        <AppButton
          label={t("done")}
          variant="quiet"
          onPress={() => {
            clearSession();
            router.replace("/(tabs)/practice");
          }}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: space[4] },
  head: { alignItems: "center", gap: space[3], paddingVertical: space[6] },
  score: { fontFamily: fonts.display, fontSize: 48, color: colors.text },
  scoreUnit: { fontFamily: fonts.display, fontSize: 20, color: colors.textMuted },
  line: { fontFamily: fonts.body, fontSize: 15, color: colors.textMuted, textAlign: "center" },
  block: { gap: space[3], marginBottom: space[6] },
  strip: { flexDirection: "row", flexWrap: "wrap", gap: space[2] },
  reviewItem: {
    minWidth: 56,
    alignItems: "center",
    gap: 2,
    paddingVertical: space[2],
    paddingHorizontal: space[3],
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
  },
  reviewGlyph: { fontFamily: fonts.jpMed, fontSize: 22, color: colors.text },
  reviewRo: { fontFamily: fonts.body, fontSize: 11, color: colors.textMuted },
  actions: { gap: space[2] },
});
