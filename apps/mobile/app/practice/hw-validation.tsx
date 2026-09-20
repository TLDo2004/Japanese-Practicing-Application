/**
 * On-device ANDROID NATIVE VALIDATION harness.
 * Runs Skia pixel probe, fixture parity, and exposes diagnostics via log + UI.
 * Does not change recognition thresholds.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  Pressable,
} from "react-native";
import { Redirect, Stack } from "expo-router";
import type { Alphabet, Drawing, MatchResult } from "@jpa/handwriting";
import {
  LOGICAL_PAD,
  RASTER_SPEC,
  extractInkFromRgba,
  getTemplateLoadStats,
  rasterizeDrawingRgba,
} from "@jpa/handwriting";
import { runMatchInkBench } from "@jpa/handwriting/bench";
import { ALL } from "@jpa/kana";
import { NativeWritingPad, type NativeWritingPadHandle } from "../../src/components/NativeWritingPad";
import {
  clearHandwritingDiagnostics,
  getHandwritingDiagnostics,
  installGlobalDiagBridge,
  probeSkiaPixelFormat,
  pushDiag,
} from "../../src/platform/handwriting/diagnostics";
import {
  inkFromLogicalDrawing,
  recognizeDrawingTimed,
  recognizeDrawingTimedSoftware,
} from "../../src/platform/handwriting/recognize";
import drawingFixtures from "../../src/platform/handwriting/drawingFixtures.json";
import humanCorpus from "../../src/platform/handwriting/humanDrawings.corpus.json";
import { colors, fonts, space } from "../../src/theme";

type ParityRow = {
  id: string;
  softStatus: string;
  skiaStatus: string;
  softInk: number;
  skiaInk: number;
  softScore: number | null;
  skiaScore: number | null;
  softBest: string | null;
  skiaBest: string | null;
  softBackend: string;
  skiaBackend: string;
  layoutUsed?: string;
};

function inkCount(rgba: Uint8Array, w: number, h: number): number {
  return extractInkFromRgba(rgba, w, h)?.count ?? 0;
}

function scoreOf(r: MatchResult): number | null {
  return "expectedScore" in r ? (r.expectedScore ?? null) : null;
}

function bestOf(r: MatchResult): string | null {
  return r.status === "empty" ? null : r.best?.ro ?? null;
}

/** Development-only harness — redirects away in release builds. */
export default function HwValidationScreen() {
  if (!__DEV__) {
    return <Redirect href="/(tabs)/practice" />;
  }
  return <HwValidationBody />;
}

function HwValidationBody() {
  const padRef = useRef<NativeWritingPadHandle>(null);
  const [probeJson, setProbeJson] = useState("not run");
  const [parity, setParity] = useState<ParityRow[]>([]);
  const [manualLog, setManualLog] = useState<string[]>([]);
  const [lastDrawing, setLastDrawing] = useState<Drawing | null>(null);
  const [guideOn, setGuideOn] = useState(false);
  const [guideParity, setGuideParity] = useState("");
  const [timingLog, setTimingLog] = useState("");
  const [diagDump, setDiagDump] = useState("");
  const [forceSoftware, setForceSoftware] = useState(false);
  const [expectedRo, setExpectedRo] = useState("a");
  const [alphabet, setAlphabet] = useState<Alphabet>("hira");
  const [benchJson, setBenchJson] = useState("not run");
  const [repeatJson, setRepeatJson] = useState("");
  const [proposal1Json, setProposal1Json] = useState("not run");

  const runProposal1Corpus = useCallback(() => {
    const targets = ["human-kata-a-1", "human-kata-n-1", "human-kata-n-2", "human-hira-ki-1"];
    const rows: Array<Record<string, unknown>> = [];
    for (const id of targets) {
      const fix = humanCorpus.fixtures.find((f) => f.id === id);
      if (!fix) continue;
      const drawing = fix.drawing as Drawing;
      const soft = recognizeDrawingTimedSoftware({
        drawing,
        alphabet: fix.alphabet as Alphabet,
        expectedRo: fix.expectedRo,
        letters: ALL,
      });
      const skia = recognizeDrawingTimed({
        drawing,
        alphabet: fix.alphabet as Alphabet,
        expectedRo: fix.expectedRo,
        letters: ALL,
        preferSkia: true,
      });
      const softR = soft.result;
      const skiaR = skia.result;
      rows.push({
        id,
        expected: fix.expectedRo,
        phase9c: (fix as { phase9cBaseline?: { status?: string } }).phase9cBaseline?.status ?? null,
        softStatus: softR.status,
        softReason: softR.status === "empty" ? "empty" : softR.acceptReason,
        softGlobalBest: softR.status === "empty" ? null : softR.globalBest.ro,
        softShown: bestOf(softR),
        softScore: scoreOf(softR),
        softMatchMs: soft.timing.matchMs,
        skiaStatus: skiaR.status,
        skiaReason: skiaR.status === "empty" ? "empty" : skiaR.acceptReason,
        skiaGlobalBest: skiaR.status === "empty" ? null : skiaR.globalBest.ro,
        skiaShown: bestOf(skiaR),
        skiaScore: scoreOf(skiaR),
        skiaMatchMs: skia.timing.matchMs,
        skiaBackend: skia.timing.backend,
      });
    }
    const text = JSON.stringify(rows, null, 2);
    setProposal1Json(text);
    console.log("[JPA_P1_EVAL]", text);
  }, []);

  useEffect(() => {
    installGlobalDiagBridge();
    pushDiag("validation-screen-mount", { logicalPad: LOGICAL_PAD, strokeWidth: RASTER_SPEC.strokeWidth });
    // PHASE 9D: deterministic Proposal 1 check on stored human Drawings (Hermes).
    runProposal1Corpus();
  }, [runProposal1Corpus]);

  const runProbe = useCallback(() => {
    clearHandwritingDiagnostics();
    const result = probeSkiaPixelFormat();
    const text = result ? JSON.stringify(result, null, 2) : "PROBE_FAILED";
    setProbeJson(text);
    console.log("[JPA_HW_PROBE]", text);
  }, []);

  const runParity = useCallback(() => {
    const rows: ParityRow[] = [];
    for (const fix of drawingFixtures.fixtures) {
      const drawing = fix.drawing as Drawing;
      const soft = recognizeDrawingTimedSoftware({
        drawing,
        alphabet: fix.alphabet as Alphabet,
        expectedRo: fix.expectedRo,
        letters: ALL,
      });
      const softRaster = rasterizeDrawingRgba(drawing, LOGICAL_PAD);
      const softInk = inkCount(softRaster.rgba, softRaster.width, softRaster.height);

      const skia = recognizeDrawingTimed({
        drawing,
        alphabet: fix.alphabet as Alphabet,
        expectedRo: fix.expectedRo,
        letters: ALL,
        preferSkia: true,
      });

      // Re-raster for ink count via Skia path when available
      let skiaInk = softInk;
      let layoutUsed = "n/a";
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { rasterizeDrawingSkia } = require("../../src/platform/handwriting/skiaRaster") as typeof import("../../src/platform/handwriting/skiaRaster");
        const r = rasterizeDrawingSkia(drawing);
        skiaInk = inkCount(r.rgba, r.width, r.height);
        layoutUsed = String(r.layoutUsed);
      } catch {
        /* software only */
      }

      rows.push({
        id: fix.id,
        softStatus: soft.result.status,
        skiaStatus: skia.result.status,
        softInk,
        skiaInk,
        softScore: scoreOf(soft.result),
        skiaScore: scoreOf(skia.result),
        softBest: bestOf(soft.result),
        skiaBest: bestOf(skia.result),
        softBackend: soft.timing.backend,
        skiaBackend: skia.timing.backend,
        layoutUsed,
      });
    }
    setParity(rows);
    console.log("[JPA_HW_PARITY]", JSON.stringify(rows));
  }, []);

  const onCheckManual = useCallback(() => {
    const drawing = padRef.current?.getDrawing() ?? [];
    setLastDrawing(drawing.length ? drawing : []);
    const strokeCount = drawing.length;
    const pointCount = drawing.reduce((n, s) => n + s.length, 0);
    const ink = inkFromLogicalDrawing(drawing, !forceSoftware);
    const timed = recognizeDrawingTimed({
      drawing,
      alphabet,
      expectedRo,
      letters: ALL,
      preferSkia: !forceSoftware,
    });
    const load = getTemplateLoadStats();
    const line = [
      `ro=${expectedRo}`,
      `alpha=${alphabet}`,
      `backend=${timed.timing.backend}`,
      `status=${timed.result.status}`,
      `score=${scoreOf(timed.result)}`,
      `best=${bestOf(timed.result)}`,
      `globalBest=${timed.result.status === "empty" ? null : timed.result.globalBest.ro}`,
      `reason=${timed.result.status === "empty" ? "empty" : timed.result.acceptReason}`,
      `strokes=${strokeCount}`,
      `pts=${pointCount}`,
      `ink=${ink?.count ?? 0}`,
      `rasterMs=${timed.timing.rasterMs.toFixed(1)}`,
      `extractMs=${timed.timing.extractMs.toFixed(1)}`,
      `matchMs=${timed.timing.matchMs.toFixed(1)}`,
      `totalMs=${timed.timing.totalMs.toFixed(1)}`,
      `unpack=${load.unpackCalls}`,
      `loadHits=${load.loadCacheHits}/${load.loadCalls}`,
    ].join(" ");
    setManualLog((prev) => [line, ...prev].slice(0, 40));
    setTimingLog(line);
    console.log("[JPA_HW_CHECK]", line);
    console.log("[JPA_HW_DRAWING]", JSON.stringify(drawing));
    if (!strokeCount) console.log("[JPA_HW_EMPTY]", line);
  }, [alphabet, expectedRo, forceSoftware]);

  const runMatchBench = useCallback(() => {
    setBenchJson("running…");
    const started = Date.now();
    const report = runMatchInkBench({
      warmup: 1,
      rounds: 3,
      naive: true,
      naiveRounds: 1,
      profile: true,
    });
    const text = JSON.stringify({ wallMs: Date.now() - started, ...report }, null, 2);
    setBenchJson(text);
    console.log("[JPA_MATCH_BENCH]", text);
  }, []);

  const runRepeatCheck = useCallback(() => {
    const drawing = padRef.current?.getDrawing() ?? lastDrawing ?? [];
    const times: number[] = [];
    let lastLine = "";
    for (let i = 0; i < 25; i++) {
      const timed = recognizeDrawingTimed({
        drawing,
        alphabet,
        expectedRo,
        letters: ALL,
        preferSkia: !forceSoftware,
      });
      times.push(timed.timing.totalMs);
      lastLine = `${timed.result.status} match=${timed.timing.matchMs.toFixed(1)} total=${timed.timing.totalMs.toFixed(1)} backend=${timed.timing.backend}`;
    }
    const sorted = [...times].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)] ?? 0;
    const p95 = sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * 0.95) - 1)] ?? 0;
    const summary = `n=25 median=${median.toFixed(1)} p95=${p95.toFixed(1)} worst=${sorted[sorted.length - 1]?.toFixed(1)} last=${lastLine} unpack=${getTemplateLoadStats().unpackCalls}`;
    setRepeatJson(summary);
    console.log("[JPA_HW_REPEAT]", summary);
  }, [alphabet, expectedRo, forceSoftware, lastDrawing]);

  const runGuideExclusion = useCallback(() => {
    const drawing = padRef.current?.getDrawing();
    if (!drawing?.some((s) => s.length)) {
      setGuideParity("draw first");
      return;
    }
    const a = recognizeDrawingTimed({
      drawing,
      alphabet,
      expectedRo,
      letters: ALL,
      preferSkia: true,
    });
    // Guide is display-only — recognition input is the same Drawing either way.
    const b = recognizeDrawingTimed({
      drawing,
      alphabet,
      expectedRo,
      letters: ALL,
      preferSkia: true,
    });
    const sameStatus = a.result.status === b.result.status;
    const sameScore = scoreOf(a.result) === scoreOf(b.result);
    const sameBest = bestOf(a.result) === bestOf(b.result);
    const msg = `guideToggleDisplayOnly sameStatus=${sameStatus} sameScore=${sameScore} sameBest=${sameBest} backend=${a.timing.backend}/${b.timing.backend}`;
    setGuideParity(msg);
    console.log("[JPA_HW_GUIDE]", msg);
  }, [alphabet, expectedRo]);

  const dumpDiag = useCallback(() => {
    const d = getHandwritingDiagnostics();
    const text = JSON.stringify(d, null, 2);
    setDiagDump(text);
    console.log("[JPA_HW_DIAG]", text);
  }, []);

  const captureFixture = useCallback(() => {
    const drawing = padRef.current?.getDrawing();
    if (!drawing) return;
    const payload = {
      id: `android-${alphabet}-${expectedRo}-${Date.now()}`,
      alphabet,
      expectedRo,
      drawing,
      capturedAt: new Date().toISOString(),
      device: "CPH2873",
    };
    console.log("[JPA_HW_FIXTURE]", JSON.stringify(payload));
    setManualLog((prev) => [`FIXTURE captured ${payload.id} strokes=${drawing.length}`, ...prev].slice(0, 40));
  }, [alphabet, expectedRo]);

  const kanaButtons = useMemo(
    () => [
      { ro: "a", alphabet: "hira" as const, label: "あ" },
      { ro: "i", alphabet: "hira" as const, label: "い" },
      { ro: "ka", alphabet: "hira" as const, label: "か" },
      { ro: "ki", alphabet: "hira" as const, label: "き" },
      { ro: "a", alphabet: "kata" as const, label: "ア" },
      { ro: "ka", alphabet: "kata" as const, label: "カ" },
      { ro: "shi", alphabet: "kata" as const, label: "シ" },
      { ro: "tsu", alphabet: "kata" as const, label: "ツ" },
      { ro: "so", alphabet: "kata" as const, label: "ソ" },
      { ro: "n", alphabet: "kata" as const, label: "ン" },
    ],
    [],
  );

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      scrollEnabled
      keyboardShouldPersistTaps="handled"
    >
      <Stack.Screen options={{ title: "HW Validation", headerShown: true }} />
      <Text style={styles.h1}>Android native handwriting validation</Text>
      <Text style={styles.meta}>
        LOGICAL_PAD={LOGICAL_PAD} strokeWidth={RASTER_SPEC.strokeWidth} cap={RASTER_SPEC.lineCap} join={RASTER_SPEC.lineJoin}
      </Text>

      <View style={styles.row}>
        <Pressable style={styles.btn} onPress={runProbe}><Text style={styles.btnText}>1. Pixel probe</Text></Pressable>
        <Pressable style={styles.btn} onPress={runParity}><Text style={styles.btnText}>2. Fixture parity</Text></Pressable>
        <Pressable style={styles.btn} onPress={runMatchBench}><Text style={styles.btnText}>3. matchInk bench</Text></Pressable>
        <Pressable style={styles.btn} onPress={runProposal1Corpus}><Text style={styles.btnText}>4. Proposal1 corpus</Text></Pressable>
        <Pressable style={styles.btn} onPress={dumpDiag}><Text style={styles.btnText}>Dump diag</Text></Pressable>
      </View>

      <Text style={styles.h2}>Proposal 1 stored human (Hermes)</Text>
      <Text style={styles.mono}>{proposal1Json.slice(0, 4000)}</Text>

      <Text style={styles.h2}>Pixel probe</Text>
      <Text style={styles.mono}>{probeJson}</Text>

      <Text style={styles.h2}>9-fixture parity</Text>
      {parity.map((r) => (
        <Text key={r.id} style={styles.mono}>
          {r.id}: soft={r.softStatus}/{r.softScore}/{r.softBest}/ink{r.softInk} | skia={r.skiaStatus}/{r.skiaScore}/{r.skiaBest}/ink{r.skiaInk} backend={r.skiaBackend} layout={r.layoutUsed}
        </Text>
      ))}

      <Text style={styles.h2}>matchInk bench (no UI/Skia)</Text>
      <Text style={styles.mono}>{benchJson.slice(0, 6000)}</Text>

      <Text style={styles.h2}>25× Check</Text>
      <Text style={styles.mono}>{repeatJson || "not run"}</Text>

      <Text style={styles.h2}>Manual pad — {alphabet}:{expectedRo}</Text>
      <View style={styles.rowWrap}>
        {kanaButtons.map((k) => (
          <Pressable
            key={`${k.alphabet}-${k.ro}-${k.label}`}
            style={[styles.chip, expectedRo === k.ro && alphabet === k.alphabet && styles.chipOn]}
            onPress={() => { setExpectedRo(k.ro); setAlphabet(k.alphabet); padRef.current?.clear(); }}
          >
            <Text style={styles.chipText}>{k.label}</Text>
          </Pressable>
        ))}
      </View>

      <View style={{ height: 280 }}>
        <NativeWritingPad
          ref={padRef}
          guideChar={alphabet === "hira"
            ? (kanaButtons.find((k) => k.ro === expectedRo && k.alphabet === "hira")?.label ?? "")
            : (kanaButtons.find((k) => k.ro === expectedRo && k.alphabet === "kata")?.label ?? "")}
          guideHidden={!guideOn}
          onDrawStart={() => {}}
        />
      </View>

      <View style={styles.row}>
        <Pressable style={styles.btn} onPress={onCheckManual}><Text style={styles.btnText}>Check</Text></Pressable>
        <Pressable style={styles.btn} onPress={() => padRef.current?.undo()}><Text style={styles.btnText}>Undo</Text></Pressable>
        <Pressable style={styles.btn} onPress={() => padRef.current?.clear()}><Text style={styles.btnText}>Clear</Text></Pressable>
        <Pressable style={styles.btn} onPress={() => setGuideOn((g) => !g)}><Text style={styles.btnText}>Guide {guideOn ? "ON" : "OFF"}</Text></Pressable>
        <Pressable style={styles.btn} onPress={runGuideExclusion}><Text style={styles.btnText}>Guide excl.</Text></Pressable>
        <Pressable style={styles.btn} onPress={captureFixture}><Text style={styles.btnText}>Capture fixture</Text></Pressable>
        <Pressable style={[styles.btn, forceSoftware && styles.chipOn]} onPress={() => setForceSoftware((v) => !v)}>
          <Text style={styles.btnText}>{forceSoftware ? "Force software" : "Prefer Skia"}</Text>
        </Pressable>
        <Pressable style={styles.btn} onPress={runRepeatCheck}><Text style={styles.btnText}>25× Check</Text></Pressable>
      </View>

      <Text style={styles.mono}>{timingLog}</Text>
      <Text style={styles.mono}>{guideParity}</Text>
      {manualLog.map((l, i) => <Text key={i} style={styles.mono}>{l}</Text>)}
      {lastDrawing ? (
        <Text style={styles.mono}>lastDrawing strokes={lastDrawing.length} sample={JSON.stringify(lastDrawing).slice(0, 240)}</Text>
      ) : null}

      <Text style={styles.h2}>Diagnostics dump</Text>
      <Text style={styles.mono}>{diagDump.slice(0, 4000)}</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  content: { padding: space[4], paddingBottom: 80, gap: 8 },
  h1: { fontFamily: fonts.display, fontSize: 22, color: colors.text },
  h2: { fontFamily: fonts.bodySemi, fontSize: 16, marginTop: 12, color: colors.text },
  meta: { fontFamily: fonts.body, fontSize: 12, color: colors.textMuted },
  mono: { fontFamily: fonts.body, fontSize: 11, color: colors.text },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  rowWrap: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  btn: { backgroundColor: colors.primary, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 6 },
  btnText: { color: "#fff", fontFamily: fonts.bodySemi, fontSize: 12 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, backgroundColor: "#e8e0d4", borderRadius: 6 },
  chipOn: { backgroundColor: colors.primary },
  chipText: { fontFamily: fonts.jp, fontSize: 18, color: colors.text },
});
