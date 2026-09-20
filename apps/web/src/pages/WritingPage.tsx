import { useEffect, useMemo, useRef, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { ALL, BY_RO } from "@jpa/kana";
import { t } from "@jpa/core";
import { atFrontier, nextRequiresCheck, writingCheckOutcome } from "@jpa/practice";
import type { MatchResult } from "@jpa/handwriting";
import { ChartGrid } from "../components/ChartGrid";
import { DrawPad, type DrawPadHandle } from "../components/DrawPad";
import { SpeakIcon } from "../components/Icons";
import { chartSectionsFor } from "../lib/chart";
import { currentPrompt, showHiraPad, showKataPad, useSession } from "../lib/session";
import { useShellMeta } from "../lib/shell-meta";
import { usePlatform } from "../platform/PlatformContext";
import { recognizeCanvas } from "../platform/handwriting/recognize";
import { verdictFromMatch, type PadVerdict } from "../platform/handwriting/verdict";

const emptyVerdict: PadVerdict = { status: "", text: "" };

function looksLikeGlyph(ro: string | undefined, script: "hira" | "kata"): string {
  if (!ro) return "";
  const letter = BY_RO[ro];
  if (!letter) return "";
  return script === "kata" ? letter.kata : letter.hira;
}

export function WritingPage() {
  const {
    session,
    current,
    goNext,
    goPrev,
    resetLive,
    toggleGuide,
    toggleJump,
    jumpToRo,
    recordWriteCheck,
    clearWriteNote,
    hintText,
    progressLabel,
    progressCounts,
  } = useSession();
  const { speech } = usePlatform();
  const navigate = useNavigate();
  const hiraRef = useRef<DrawPadHandle>(null);
  const kataRef = useRef<DrawPadHandle>(null);
  const rootRef = useRef<HTMLElement>(null);
  const strokeOrder = useRef<Array<"hira" | "kata">>([]);
  const [hiraVerdict, setHiraVerdict] = useState<PadVerdict>(emptyVerdict);
  const [kataVerdict, setKataVerdict] = useState<PadVerdict>(emptyVerdict);
  const [bothStep, setBothStep] = useState(0);
  const [narrow, setNarrow] = useState(() => (
    typeof window !== "undefined" && window.matchMedia("(max-width: 639px)").matches
  ));
  const [speechHint, setSpeechHint] = useState("");

  const prompt = currentPrompt(session, current);
  const hiraOn = showHiraPad(prompt);
  const kataOn = showKataPad(prompt);
  const bothPads = hiraOn && kataOn;
  /**
   * Narrow screens ask for hiragana then katakana one pad at a time. This is a
   * presentation step only — the deck item, scoring and session progress stay
   * a single logical practice item.
   */
  const stepped = bothPads && narrow;
  const sections = useMemo(
    () => chartSectionsFor(session?.letters || ALL, "all"),
    [session?.letters],
  );

  const counts = progressCounts();

  useShellMeta(session && current ? {
    title: session.learnDrill ? t("title_trace") : t("title_writing"),
    progress: session.learnDrill ? "" : progressLabel(),
  } : null);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 639px)");
    const onChange = () => setNarrow(media.matches);
    onChange();
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    setHiraVerdict(emptyVerdict);
    setKataVerdict(emptyVerdict);
    setBothStep(0);
    strokeOrder.current = [];
    hiraRef.current?.clear();
    kataRef.current?.clear();
  }, [current?.key]);

  useEffect(() => {
    speech.setHintHandler((key) => setSpeechHint(t(key)));
  }, [speech]);

  const speakSafe = () => {
    try {
      if (current) speech.speakCurrent(current);
    } catch {
      /* speech must not crash a session */
    }
  };

  const judgePad = (kind: "hira" | "kata"): MatchResult => {
    const pad = kind === "hira" ? hiraRef.current : kataRef.current;
    const snap = pad?.getSnapshot();
    if (!snap || !current || !session) return { status: "empty" };
    return recognizeCanvas({
      canvas: snap.canvas,
      drawing: snap.drawing,
      alphabet: kind,
      expectedRo: current.ro,
      letters: session.letters,
    });
  };

  const onCheck = () => {
    if (!current) return;
    const hira = hiraOn ? judgePad("hira") : { status: "empty" as const };
    const kata = kataOn ? judgePad("kata") : { status: "empty" as const };
    if (hiraOn) setHiraVerdict(verdictFromMatch(hira, current.ro, t));
    if (kataOn) setKataVerdict(verdictFromMatch(kata, current.ro, t));
    const judged = [];
    if (hiraOn) judged.push(hira);
    if (kataOn) judged.push(kata);
    const outcome = writingCheckOutcome(judged);
    recordWriteCheck(outcome);
    if (outcome === "ok") speakSafe();
  };

  const onClear = () => {
    hiraRef.current?.clear();
    kataRef.current?.clear();
    strokeOrder.current = [];
    setHiraVerdict(emptyVerdict);
    setKataVerdict(emptyVerdict);
    clearWriteNote();
  };

  const undoLast = () => {
    while (strokeOrder.current.length) {
      const pad = strokeOrder.current.pop();
      if (pad === "hira" && hiraRef.current?.undo()) return;
      if (pad === "kata" && kataRef.current?.undo()) return;
    }
    if (!hiraRef.current?.undo()) kataRef.current?.undo();
  };

  const onNext = () => {
    const result = goNext();
    if (result === "summary") navigate("/practice/summary");
  };

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const typing = event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement;
      if (typing) return;
      if ((event.ctrlKey || event.metaKey) && (event.key === "z" || event.key === "Z")) {
        event.preventDefault();
        undoLast();
        return;
      }
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        goPrev();
      } else if (event.key === "ArrowRight" || event.key === " " || event.key === "Enter") {
        event.preventDefault();
        onNext();
      } else if (event.key === "k" || event.key === "K") {
        onCheck();
      } else if (event.key === "g" || event.key === "G" || event.key === "h" || event.key === "H") {
        toggleGuide();
      } else if (event.key === "c" || event.key === "C") {
        onClear();
      } else if ((event.key === "r" || event.key === "R") && session && !session.learnDrill) {
        resetLive();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    let start: { x: number; y: number } | null = null;
    const onStart = (event: TouchEvent) => {
      const target = event.target as Element | null;
      if (target && target.closest("canvas, button, input, label")) return;
      const touch = event.changedTouches[0];
      if (!touch) return;
      start = { x: touch.clientX, y: touch.clientY };
    };
    const onEnd = (event: TouchEvent) => {
      if (!start) return;
      const touch = event.changedTouches[0];
      const dx = touch ? touch.clientX - start.x : 0;
      const dy = touch ? touch.clientY - start.y : 0;
      start = null;
      if (Math.abs(dx) < 56 || Math.abs(dy) > Math.abs(dx) * 0.65) return;
      if (dx < 0) onNext();
      else goPrev();
    };
    root.addEventListener("touchstart", onStart, { passive: true });
    root.addEventListener("touchend", onEnd, { passive: true });
    return () => {
      root.removeEventListener("touchstart", onStart);
      root.removeEventListener("touchend", onEnd);
    };
  });

  if (!session || session.kind !== "write") return <Navigate to="/practice" replace />;
  if (session.hydrated && session.completed) return <Navigate to="/practice" replace />;
  if (!current) return <Navigate to="/practice" replace />;

  const nextBlocked = session.learnDrill
    ? session.pathIndex >= session.deck.length - 1
    : nextRequiresCheck({
      learnDrill: false,
      atFrontier: atFrontier(session.pathIndex, session.path.length),
      checkedCurrent: session.checkedCurrent,
    });

  const instruction = stepped
    ? (bothStep === 0 ? t("instruction_write_hira") : t("instruction_write_kata"))
    : prompt === "kata"
      ? t("instruction_write_kata")
      : prompt === "both"
        ? t("instruction_write_both")
        : t("instruction_write_hira");

  const feedbackStatus = hiraVerdict.status || kataVerdict.status;

  /**
   * Reveal expected kana only after Check for that script.
   * Combined stepped mode must not leak the upcoming script's answer.
   */
  const revealHira = hiraOn && hiraVerdict.status !== "" && !(stepped && bothStep !== 0);
  const revealKata = kataOn && kataVerdict.status !== "" && !(stepped && bothStep !== 1);
  const revealScript: "hira" | "kata" | null = revealKata && (!revealHira || (stepped && bothStep === 1))
    ? "kata"
    : revealHira
      ? "hira"
      : null;
  const revealVerdict = revealScript === "kata" ? kataVerdict : hiraVerdict;
  const revealKana = revealScript === "kata"
    ? current.kata
    : revealScript === "hira"
      ? current.hira
      : "";
  const revealLooks = revealScript
    ? looksLikeGlyph(revealVerdict.looksLikeRo, revealScript)
    : "";

  return (
    <section ref={rootRef}>
      <div className="stage-progress">
        <span className="meter" aria-hidden="true">
          <span
            className="meter-fill"
            style={{ width: counts.total ? `${Math.round((counts.n / counts.total) * 100)}%` : "0%" }}
          />
        </span>
        <span className="count">{progressLabel()}</span>
      </div>

      <div className="stage-head">
        <div className="prompt-row">
          <p className="prompt-ro">{current.ro}</p>
          <button
            className="btn-icon"
            type="button"
            aria-label={t("play_sound")}
            title={t("play_sound")}
            onClick={speakSafe}
          >
            <SpeakIcon />
          </button>
        </div>
        <p className="instruction">{instruction}</p>
      </div>

      {stepped ? (
        <div className="segmented" role="tablist" aria-label={t("pick_both")} style={{ marginBottom: "var(--s-4)" }}>
          <button
            type="button"
            role="tab"
            aria-selected={bothStep === 0}
            className={`segment${bothStep === 0 ? " is-active" : ""}`}
            onClick={() => setBothStep(0)}
          >
            {t("step_of", { n: 1, script: t("hiragana") })}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={bothStep === 1}
            className={`segment${bothStep === 1 ? " is-active" : ""}`}
            onClick={() => setBothStep(1)}
          >
            {t("step_of", { n: 2, script: t("katakana") })}
          </button>
        </div>
      ) : null}

      <div className={`pads${bothPads && !stepped ? " is-side-by-side" : ""}`}>
        {hiraOn ? (
          <DrawPad
            ref={hiraRef}
            label={t("hiragana")}
            ariaLabel={t("pad_hira")}
            guide={session.guideHidden ? "" : current.hira}
            guideOff={session.guideHidden}
            result={hiraVerdict.text}
            resultStatus={hiraVerdict.status}
            frameStatus={hiraVerdict.status}
            hidden={stepped && bothStep !== 0}
            onDrawStart={() => { strokeOrder.current.push("hira"); }}
          />
        ) : null}
        {kataOn ? (
          <DrawPad
            ref={kataRef}
            label={t("katakana")}
            ariaLabel={t("pad_kata")}
            guide={session.guideHidden ? "" : current.kata}
            guideOff={session.guideHidden}
            result={kataVerdict.text}
            resultStatus={kataVerdict.status}
            frameStatus={kataVerdict.status}
            hidden={stepped && bothStep !== 1}
            onDrawStart={() => { strokeOrder.current.push("kata"); }}
          />
        ) : null}
      </div>

      <div className="tool-row">
        <button className="btn btn-quiet" type="button" onClick={undoLast}>{t("undo")}</button>
        <button className="btn btn-quiet" type="button" onClick={toggleGuide}>
          {session.guideHidden ? t("show_guide") : t("hide_guide")}
        </button>
        <button className="btn btn-quiet" type="button" onClick={onClear}>{t("clear")}</button>
      </div>

      <div className="commit-row">
        {session.checkedCurrent ? (
          <>
            <button className="btn btn-secondary" type="button" onClick={onClear}>
              {t("try_again")}
            </button>
            <button
              className="btn btn-primary"
              type="button"
              data-testid="next-btn"
              onClick={onNext}
              disabled={nextBlocked}
            >
              {t("next")}
            </button>
          </>
        ) : (
          <button className="btn btn-primary" type="button" data-testid="check-btn" onClick={onCheck}>
            {t("check")}
          </button>
        )}
      </div>

      {revealScript && revealKana ? (
        <div
          className="write-reveal"
          role="status"
          aria-live="polite"
          data-testid="write-reveal"
          data-status={revealVerdict.status}
          data-kana={revealKana}
        >
          {revealVerdict.status === "ok" ? (
            <>
              <p className="write-reveal-kana is-ok">{revealKana}</p>
              <p className="write-reveal-label is-ok">{t("correct")}</p>
              <p className="write-reveal-ro">{current.ro}</p>
            </>
          ) : (
            <>
              <p className="write-reveal-meta">
                {t("expected")}
                <span className="glyph">{revealKana}</span>
              </p>
              {revealLooks ? (
                <p className="write-reveal-meta">
                  {t("looks_like_glyph")}
                  <span className="glyph">{revealLooks}</span>
                </p>
              ) : null}
              <p className={`write-reveal-label is-bad`}>{revealVerdict.text}</p>
            </>
          )}
        </div>
      ) : (
        <p className={`feedback${feedbackStatus ? ` is-${feedbackStatus}` : ""}`} role="status" aria-live="polite">
          {speechHint || hintText()}
        </p>
      )}

      {session.learnDrill ? (
        <div className="btn-row center" style={{ marginTop: "var(--s-5)" }}>
          <button className="btn btn-quiet" type="button" onClick={goPrev} disabled={session.pathIndex <= 0}>
            {t("previous")}
          </button>
        </div>
      ) : (
        <div className="btn-row center" style={{ marginTop: "var(--s-5)" }}>
          <button className="btn btn-quiet" type="button" onClick={goPrev} disabled={session.pathIndex <= 0}>
            {t("previous")}
          </button>
          <button className="btn btn-quiet" type="button" onClick={resetLive}>{t("restart")}</button>
          <button className="btn btn-quiet" type="button" onClick={toggleJump}>
            {session.jumpOpen ? t("hide_jump") : t("show_jump")}
          </button>
        </div>
      )}

      <p className="swipe-note">{t("swipe_note")}</p>

      {session.jumpOpen && !session.learnDrill ? (
        <div style={{ marginTop: "var(--s-5)" }}>
          <ChartGrid
            sections={sections}
            script={session.script}
            clickable
            currentRo={current.ro}
            usedRos={new Set(session.usedKeys.map((key) => key.replace(/-hira$/, "").replace(/-kata$/, "")))}
            onPick={(letter) => jumpToRo(letter.ro)}
          />
        </div>
      ) : null}

      <p className="keys">
        <kbd>K</kbd> {t("key_check")} · <kbd>G</kbd> {t("key_guide")} · <kbd>C</kbd> {t("key_clear")}
        {" · "}<kbd>←</kbd><kbd>→</kbd> {t("key_move")}
      </p>
    </section>
  );
}
