import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Redirect, useNavigation, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { t } from "@jpa/core";
import { BY_RO } from "@jpa/kana";
import type { Drawing } from "@jpa/handwriting";
import { atFrontier, nextRequiresCheck, writingCheckOutcome, showHiraPad, showKataPad } from "@jpa/practice";
import { AppButton } from "../../src/components/AppButton";
import { NativeWritingPad, type NativeWritingPadHandle } from "../../src/components/NativeWritingPad";
import { Feedback, Meter, Segmented } from "../../src/components/ui";
import { bothStepScript } from "../../src/lib/bothAtOnce";
import {
  recognizeDrawing,
  verdictFromMatch,
  type PadVerdict,
} from "../../src/platform/handwriting/recognize";
import { usePlatform } from "../../src/platform/PlatformContext";
import { currentPrompt, useSession } from "../../src/session/SessionContext";
import { colors, fonts, space, touch } from "../../src/theme";

const emptyVerdict: PadVerdict = { status: "", text: "" };

function looksLikeGlyph(ro: string | undefined, script: "hira" | "kata"): string {
  if (!ro) return "";
  const letter = BY_RO[ro];
  if (!letter) return "";
  return script === "kata" ? letter.kata : letter.hira;
}

/**
 * Writing + native handwriting recognition.
 *
 * Hiragana + katakana is presented as two steps on one screen, but it stays a
 * single logical practice item: one deck key, one Check, one scored result.
 */
export default function WritingScreen() {
  const { speech } = usePlatform();
  const {
    session, current, goNext, goPrev, toggleGuide, recordWriteCheck, clearWriteNote,
    hintText, progressLabel, progressCounts,
  } = useSession();
  const padRef = useRef<NativeWritingPadHandle>(null);
  const drawingsRef = useRef<{ hira: Drawing | null; kata: Drawing | null }>({ hira: null, kata: null });
  const [bothStep, setBothStep] = useState<0 | 1>(0);
  const [hiraVerdict, setHiraVerdict] = useState<PadVerdict>(emptyVerdict);
  const [kataVerdict, setKataVerdict] = useState<PadVerdict>(emptyVerdict);
  const [speechHint, setSpeechHint] = useState("");
  const [drawingActive, setDrawingActive] = useState(false);
  const router = useRouter();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  const prompt = currentPrompt(session, current);
  const hiraOn = showHiraPad(prompt);
  const kataOn = showKataPad(prompt);
  const bothPads = !!(hiraOn && kataOn);
  const activeScript: "hira" | "kata" = bothPads
    ? bothStepScript(bothStep)
    : (hiraOn ? "hira" : "kata");
  const guideChar = current
    ? (activeScript === "kata" ? current.kata : current.hira)
    : "";
  const activeVerdict = activeScript === "kata" ? kataVerdict : hiraVerdict;
  const counts = progressCounts();

  useLayoutEffect(() => {
    navigation.setOptions({
      title: session?.learnDrill ? t("title_trace") : t("title_writing"),
      headerRight: () => (
        session?.learnDrill
          ? null
          : <Text style={styles.progress}>{progressLabel()}</Text>
      ),
    });
  }, [navigation, session?.learnDrill, progressLabel]);

  useEffect(() => {
    speech.setHintHandler((key) => setSpeechHint(t(key)));
  }, [speech]);

  useEffect(() => {
    setBothStep(0);
    setHiraVerdict(emptyVerdict);
    setKataVerdict(emptyVerdict);
    drawingsRef.current = { hira: null, kata: null };
    padRef.current?.clear();
  }, [current?.key]);

  useEffect(() => {
    if (session?.completed) router.replace("/practice/summary");
  }, [session?.completed, router]);

  if (!session || session.kind !== "write") {
    return <Redirect href="/(tabs)/practice" />;
  }
  if (!current) return <Redirect href="/(tabs)/practice" />;

  const persistActiveStep = () => {
    const drawing = padRef.current?.getDrawing() ?? null;
    if (activeScript === "hira") drawingsRef.current.hira = drawing;
    else drawingsRef.current.kata = drawing;
  };

  const goBothStep = (next: 0 | 1) => {
    persistActiveStep();
    setBothStep(next);
    const script = bothStepScript(next);
    const stored = script === "hira" ? drawingsRef.current.hira : drawingsRef.current.kata;
    padRef.current?.setDrawing(stored);
  };

  const onCheck = () => {
    if (!current || !session) return;
    persistActiveStep();

    const judge = (kind: "hira" | "kata") => {
      const drawing = kind === "hira" ? drawingsRef.current.hira : drawingsRef.current.kata;
      return recognizeDrawing({
        drawing: drawing && drawing.some((s) => s.length) ? drawing : [],
        alphabet: kind,
        expectedRo: current.ro,
        letters: session.letters,
        preferSkia: true,
      });
    };

    const hira = hiraOn ? judge("hira") : { status: "empty" as const };
    const kata = kataOn ? judge("kata") : { status: "empty" as const };
    if (hiraOn) setHiraVerdict(verdictFromMatch(hira, current.ro, t));
    if (kataOn) setKataVerdict(verdictFromMatch(kata, current.ro, t));

    const judged = [];
    if (hiraOn) judged.push(hira);
    if (kataOn) judged.push(kata);
    recordWriteCheck(writingCheckOutcome(judged));
    if (writingCheckOutcome(judged) === "ok") {
      try { speech.speakCurrent(current); } catch { /* non-fatal */ }
    }
  };

  const onClear = () => {
    padRef.current?.clear();
    if (activeScript === "hira") {
      drawingsRef.current.hira = null;
      setHiraVerdict(emptyVerdict);
    } else {
      drawingsRef.current.kata = null;
      setKataVerdict(emptyVerdict);
    }
    if (!bothPads) {
      drawingsRef.current = { hira: null, kata: null };
      setHiraVerdict(emptyVerdict);
      setKataVerdict(emptyVerdict);
    }
    clearWriteNote();
  };

  const nextBlocked = session.learnDrill
    ? session.pathIndex >= session.deck.length - 1
    : nextRequiresCheck({
      learnDrill: false,
      atFrontier: atFrontier(session.pathIndex, session.path.length),
      checkedCurrent: session.checkedCurrent,
    });

  const instruction = activeScript === "kata"
    ? t("instruction_write_kata")
    : t("instruction_write_hira");

  const revealKana = activeScript === "kata" ? current.kata : current.hira;
  const showReveal = activeVerdict.status !== "";
  const looksGlyph = looksLikeGlyph(activeVerdict.looksLikeRo, activeScript);

  return (
    <ScrollView
      scrollEnabled={!drawingActive}
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + space[6] }]}
      keyboardShouldPersistTaps="handled"
    >
      {session.learnDrill ? null : (
        <View style={styles.progressRow}>
          <View style={styles.meterWrap}>
            <Meter pct={counts.total ? Math.round((counts.n / counts.total) * 100) : 0} />
          </View>
          <Text style={styles.count}>{progressLabel()}</Text>
        </View>
      )}

      <View style={styles.promptRow}>
        <Text style={styles.romaji}>{current.ro}</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("play_sound")}
          onPress={() => {
            try { speech.speakCurrent(current); } catch { /* non-fatal */ }
          }}
          style={({ pressed }) => [styles.iconBtn, pressed ? styles.pressed : null]}
        >
          <Text style={styles.iconBtnText}>♪</Text>
        </Pressable>
      </View>
      <Text style={styles.instruction}>{instruction}</Text>

      {bothPads ? (
        <Segmented
          accessibilityLabel={t("pick_both")}
          value={String(bothStep)}
          items={[
            { id: "0", label: t("step_of", { n: 1, script: t("hiragana") }) },
            { id: "1", label: t("step_of", { n: 2, script: t("katakana") }) },
          ]}
          onChange={(id) => goBothStep(id === "1" ? 1 : 0)}
        />
      ) : null}

      <NativeWritingPad
        ref={padRef}
        guideChar={guideChar}
        guideHidden={session.guideHidden}
        accessibilityLabel={activeScript === "kata" ? t("pad_kata") : t("pad_hira")}
        resultStatus={activeVerdict.status}
        onDrawStart={() => {
          setDrawingActive(true);
          clearWriteNote();
        }}
      />

      <View style={styles.tools}>
        <AppButton
          label={t("undo")}
          variant="quiet"
          onPress={() => {
            padRef.current?.undo();
            setDrawingActive(false);
          }}
        />
        <AppButton
          label={session.guideHidden ? t("show_guide") : t("hide_guide")}
          variant="quiet"
          onPress={toggleGuide}
        />
        <AppButton
          label={t("clear")}
          variant="quiet"
          onPress={() => {
            setDrawingActive(false);
            onClear();
          }}
        />
      </View>

      {session.checkedCurrent ? (
        <View style={styles.commitRow}>
          <AppButton
            label={t("try_again")}
            variant="secondary"
            style={styles.grow}
            onPress={() => {
              setDrawingActive(false);
              onClear();
            }}
          />
          <AppButton
            label={t("next")}
            style={styles.grow}
            disabled={nextBlocked}
            onPress={() => {
              const result = goNext();
              if (result === "summary") router.replace("/practice/summary");
            }}
          />
        </View>
      ) : (
        <View style={styles.commitRow}>
          <AppButton
            label={t("check")}
            style={styles.grow}
            onPress={() => {
              setDrawingActive(false);
              onCheck();
            }}
          />
        </View>
      )}

      {showReveal ? (
        <View
          style={styles.reveal}
          accessibilityLiveRegion="polite"
          testID="write-reveal"
          accessibilityLabel={
            activeVerdict.status === "ok"
              ? `${revealKana}, ${t("correct")}, ${current.ro}`
              : `${t("expected")} ${revealKana}`
          }
        >
          {activeVerdict.status === "ok" ? (
            <>
              <Text style={[styles.revealKana, styles.revealOk]}>{revealKana}</Text>
              <Text style={[styles.revealLabel, styles.revealOk]}>{t("correct")}</Text>
              <Text style={styles.revealRo}>{current.ro}</Text>
            </>
          ) : (
            <>
              <Text style={styles.revealMeta}>
                {t("expected")} <Text style={styles.revealGlyph}>{revealKana}</Text>
              </Text>
              {looksGlyph ? (
                <Text style={styles.revealMeta}>
                  {t("looks_like_glyph")} <Text style={styles.revealGlyph}>{looksGlyph}</Text>
                </Text>
              ) : null}
              <Text style={[styles.revealLabel, styles.revealBad]}>{activeVerdict.text}</Text>
            </>
          )}
        </View>
      ) : (
        <Feedback
          text={speechHint || hintText()}
          status={activeVerdict.status}
        />
      )}

      <View style={styles.quietRow}>
        <AppButton
          label={t("previous")}
          variant="quiet"
          disabled={session.pathIndex <= 0}
          onPress={goPrev}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: space[4], gap: space[4] },
  progress: { fontFamily: fonts.bodyMed, color: colors.textMuted, marginRight: space[3], fontSize: 13 },
  progressRow: { flexDirection: "row", alignItems: "center", gap: space[3] },
  meterWrap: { flex: 1 },
  count: { fontFamily: fonts.bodySemi, fontSize: 13, color: colors.textMuted },
  promptRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: space[3] },
  romaji: { fontFamily: fonts.display, fontSize: 40, color: colors.text },
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
  instruction: {
    fontFamily: fonts.bodySemi,
    fontSize: 12,
    letterSpacing: 1,
    textTransform: "uppercase",
    textAlign: "center",
    color: colors.textMuted,
    marginTop: -space[2],
  },
  tools: { flexDirection: "row", justifyContent: "center", gap: space[2] },
  commitRow: { flexDirection: "row", gap: space[3] },
  grow: { flex: 1 },
  quietRow: { flexDirection: "row", justifyContent: "center" },
  reveal: { alignItems: "center", gap: space[2], paddingVertical: space[2] },
  revealKana: { fontFamily: fonts.jpMed, fontSize: 64, color: colors.text },
  revealLabel: { fontFamily: fonts.bodySemi, fontSize: 16 },
  revealRo: { fontFamily: fonts.bodyMed, fontSize: 16, color: colors.textMuted },
  revealMeta: { fontFamily: fonts.body, fontSize: 15, color: colors.textMuted },
  revealGlyph: { fontFamily: fonts.jpMed, fontSize: 22, color: colors.text },
  revealOk: { color: colors.positiveText },
  revealBad: { color: colors.redText },
});
