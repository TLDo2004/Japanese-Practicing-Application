import { useEffect, useLayoutEffect, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Redirect, useNavigation, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { t } from "@jpa/core";
import { AppButton } from "../../src/components/AppButton";
import { Feedback, Meter } from "../../src/components/ui";
import { usePlatform } from "../../src/platform/PlatformContext";
import { currentPrompt, useSession } from "../../src/session/SessionContext";
import { colors, fonts, radius, space, touch } from "../../src/theme";

export default function QuizScreen() {
  const { speech } = usePlatform();
  const {
    session, current, checkQuiz, skipQuiz, toggleQuizHint, goNext, goPrev,
    hintText, progressLabel, progressCounts,
  } = useSession();
  const [input, setInput] = useState("");
  const [speechHint, setSpeechHint] = useState("");
  const router = useRouter();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  useLayoutEffect(() => {
    navigation.setOptions({
      title: t("title_reading"),
      headerRight: () => <Text style={styles.progress}>{progressLabel()}</Text>,
    });
  }, [navigation, progressLabel]);

  useEffect(() => {
    speech.setHintHandler((key) => setSpeechHint(t(key)));
  }, [speech]);

  useEffect(() => {
    setInput("");
  }, [current?.key]);

  useEffect(() => {
    if (session?.completed) router.replace("/practice/summary");
  }, [session?.completed, router]);

  if (!session || session.kind !== "quiz") {
    return <Redirect href="/(tabs)/practice" />;
  }
  if (!current) return <Redirect href="/(tabs)/practice" />;

  const prompt = currentPrompt(session, current);
  const glyph = prompt === "kata" ? current.kata : current.hira;
  const status = session.quizVerdict?.status;
  const counts = progressCounts();

  const speakSafe = () => {
    try {
      speech.speakCurrent(current);
    } catch {
      /* speech must not crash a session */
    }
  };

  const onCheck = () => {
    checkQuiz(input);
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={80}
    >
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + space[6] }]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.progressRow}>
          <View style={styles.meterWrap}>
            <Meter pct={counts.total ? Math.round((counts.n / counts.total) * 100) : 0} />
          </View>
          <Text style={styles.count}>{progressLabel()}</Text>
        </View>

        <Text style={styles.instruction}>
          {prompt === "kata" ? t("instruction_read_kata") : t("instruction_read_hira")}
        </Text>

        <View style={styles.promptRow}>
          <Text style={styles.prompt} accessibilityRole="header">{glyph}</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("play_sound")}
            onPress={speakSafe}
            style={({ pressed }) => [styles.iconBtn, pressed ? styles.pressed : null]}
          >
            <Text style={styles.iconBtnText}>♪</Text>
          </Pressable>
        </View>

        <View style={styles.answerRow}>
          <TextInput
            value={input}
            onChangeText={setInput}
            autoCapitalize="none"
            autoCorrect={false}
            placeholder={t("quiz_placeholder")}
            placeholderTextColor={colors.textMuted}
            accessibilityLabel={t("quiz_placeholder")}
            style={styles.input}
            onSubmitEditing={onCheck}
            returnKeyType="done"
          />
          <AppButton label={t("check")} onPress={onCheck} />
        </View>

        <Feedback
          text={session.quizVerdict?.text || speechHint || hintText() || t("quiz_hint")}
          status={status}
        />

        <View style={styles.commitRow}>
          <AppButton
            label={session.quizHintShown ? t("hide_hint") : t("show_hint")}
            variant="secondary"
            style={styles.grow}
            onPress={toggleQuizHint}
          />
          <AppButton
            label={t("next")}
            style={styles.grow}
            disabled={!session.checkedCurrent && session.pathIndex >= session.path.length - 1}
            onPress={() => {
              const result = goNext();
              if (result === "summary") router.replace("/practice/summary");
            }}
          />
        </View>

        <View style={styles.quietRow}>
          <AppButton
            label={t("previous")}
            variant="quiet"
            disabled={session.pathIndex <= 0}
            onPress={goPrev}
          />
          <AppButton
            label={t("skip")}
            variant="quiet"
            onPress={() => {
              const next = skipQuiz();
              if (next === "summary") router.replace("/practice/summary");
            }}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  content: { padding: space[4], gap: space[4] },
  progress: { fontFamily: fonts.bodyMed, color: colors.textMuted, marginRight: space[3], fontSize: 13 },
  progressRow: { flexDirection: "row", alignItems: "center", gap: space[3] },
  meterWrap: { flex: 1 },
  count: { fontFamily: fonts.bodySemi, fontSize: 13, color: colors.textMuted },
  instruction: {
    fontFamily: fonts.bodySemi,
    fontSize: 12,
    letterSpacing: 1,
    textTransform: "uppercase",
    textAlign: "center",
    color: colors.textMuted,
  },
  promptRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: space[3] },
  prompt: { fontFamily: fonts.jpMed, fontSize: 88, lineHeight: 104, color: colors.text },
  iconBtn: {
    width: touch,
    height: touch,
    borderRadius: touch / 2,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  iconBtnText: { fontSize: 18, color: colors.textMuted },
  pressed: { backgroundColor: colors.surfaceSubtle },
  answerRow: { flexDirection: "row", gap: space[2] },
  input: {
    flex: 1,
    minHeight: 52,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    paddingHorizontal: space[4],
    fontFamily: fonts.body,
    fontSize: 18,
    textAlign: "center",
    color: colors.text,
  },
  commitRow: { flexDirection: "row", gap: space[3] },
  grow: { flex: 1 },
  quietRow: { flexDirection: "row", justifyContent: "center", gap: space[2] },
});
