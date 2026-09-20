import { useEffect, useLayoutEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { Redirect, useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import { BY_RO } from "@jpa/kana";
import { isLearned, t } from "@jpa/core";
import { AppButton } from "../../../src/components/AppButton";
import { Eyebrow, Feedback, Muted } from "../../../src/components/ui";
import { usePlatform } from "../../../src/platform/PlatformContext";
import { useSession } from "../../../src/session/SessionContext";
import { colors, fonts, radius, space } from "../../../src/theme";

/**
 * Shows only what the app actually knows about a character: both scripts, the
 * romaji, audio, and learned state. There is no vocabulary data in the product,
 * so no examples are invented here.
 */
export default function CharacterScreen() {
  const { script: scriptParam, ro } = useLocalSearchParams<{ script: string; ro: string }>();
  const script = scriptParam === "kata" ? "kata" : "hira";
  const letter = ro ? BY_RO[ro] : undefined;
  const { store, speech } = usePlatform();
  const { beginLearnDrill } = useSession();
  const router = useRouter();
  const navigation = useNavigation();
  const [speechHint, setSpeechHint] = useState("");

  const glyph = letter ? (script === "kata" ? letter.kata : letter.hira) : "";

  useLayoutEffect(() => {
    navigation.setOptions({ title: glyph });
  }, [navigation, glyph]);

  useEffect(() => {
    speech.setHintHandler((key) => setSpeechHint(t(key)));
  }, [speech]);

  if (!letter) return <Redirect href="/(tabs)/learn" />;

  const learned = isLearned(store.learned, script, letter.ro);

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.hero}>
        <Text style={styles.heroGlyph}>{glyph}</Text>
        <Text style={styles.heroRo}>{letter.ro}</Text>
        <View style={styles.state}>
          <View style={[styles.dot, learned ? styles.dotOn : null]} />
          <Text style={styles.stateText}>{learned ? t("learned") : t("not_learned")}</Text>
        </View>
      </View>

      <AppButton
        label={t("detail_listen")}
        variant="secondary"
        onPress={() => {
          try {
            speech.speakCurrent(letter);
          } catch {
            /* speech must never break the screen */
          }
        }}
      />
      <Feedback text={speechHint} />

      <View style={styles.pairBlock}>
        <Eyebrow>{t("detail_also_written")}</Eyebrow>
        <View style={styles.pair}>
          <View style={styles.pairItem}>
            <Text style={styles.pairGlyph}>{letter.hira}</Text>
            <Muted>{t("hiragana")}</Muted>
          </View>
          <View style={styles.pairItem}>
            <Text style={styles.pairGlyph}>{letter.kata}</Text>
            <Muted>{t("katakana")}</Muted>
          </View>
        </View>
      </View>

      <AppButton
        label={t("detail_practice")}
        onPress={() => {
          beginLearnDrill(script, letter);
          router.push("/practice/writing");
        }}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: space[4], gap: space[4], paddingBottom: space[7] },
  hero: {
    alignItems: "center",
    gap: space[2],
    paddingVertical: space[6],
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
  },
  heroGlyph: { fontFamily: fonts.jpMed, fontSize: 112, lineHeight: 128, color: colors.text },
  heroRo: { fontFamily: fonts.display, fontSize: 26, color: colors.text },
  state: { flexDirection: "row", alignItems: "center", gap: space[2] },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  dotOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  stateText: { fontFamily: fonts.body, fontSize: 13, color: colors.textMuted },
  pairBlock: { gap: space[3] },
  pair: { flexDirection: "row", gap: space[3] },
  pairItem: {
    flex: 1,
    alignItems: "center",
    gap: space[1],
    padding: space[4],
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
  },
  pairGlyph: { fontFamily: fonts.jpMed, fontSize: 36, color: colors.text },
});
