import { useEffect, useState, type FormEvent } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { t } from "@jpa/core";
import { romajiMatches } from "@jpa/practice";
import { SpeakIcon } from "../components/Icons";
import { currentPrompt, useSession } from "../lib/session";
import { useShellMeta } from "../lib/shell-meta";
import { usePlatform } from "../platform/PlatformContext";

export function QuizPage() {
  const {
    session,
    current,
    goNext,
    goPrev,
    resetLive,
    checkQuiz,
    skipQuiz,
    toggleQuizHint,
    hintText,
    progressLabel,
    progressCounts,
  } = useSession();
  const { speech } = usePlatform();
  const navigate = useNavigate();
  const [input, setInput] = useState("");
  const [speechHint, setSpeechHint] = useState("");

  useShellMeta(session ? { title: t("title_reading"), progress: progressLabel() } : null);

  const speakSafe = () => {
    try {
      if (current) speech.speakCurrent(current);
    } catch {
      /* speech must not crash a session */
    }
  };

  useEffect(() => {
    speech.setHintHandler((key) => setSpeechHint(t(key)));
  }, [speech]);

  const onNext = () => {
    const result = goNext();
    if (result === "item") setInput("");
    if (result === "summary") navigate("/practice/summary");
  };

  const onSkip = () => {
    const result = skipQuiz();
    setInput("");
    if (result === "summary") navigate("/practice/summary");
  };

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
      event.preventDefault();
      if (event.key === "ArrowLeft") goPrev();
      else onNext();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  if (!session || session.kind !== "quiz" || !current) {
    return <Navigate to="/practice" replace />;
  }
  if (session.hydrated && session.completed) {
    return <Navigate to="/practice" replace />;
  }

  const prompt = currentPrompt(session, current);
  const kana = prompt === "kata" ? current.kata : current.hira;
  const counts = progressCounts();

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    const ok = romajiMatches(input, current.ro);
    checkQuiz(input);
    if (ok) speakSafe();
  };

  return (
    <section>
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
        <p className="instruction">
          {prompt === "kata" ? t("instruction_read_kata") : t("instruction_read_hira")}
        </p>
        <div className="prompt-row">
          <p className="prompt-kana">{kana}</p>
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
      </div>

      <form className="answer-form" onSubmit={onSubmit}>
        <input
          type="text"
          autoComplete="off"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          inputMode="text"
          placeholder={t("quiz_placeholder")}
          value={input}
          onChange={(event) => setInput(event.target.value)}
          aria-label={t("quiz_placeholder")}
        />
        <button className="btn btn-primary" type="submit">{t("check")}</button>
      </form>

      <p
        className={`feedback${session.quizVerdict ? ` is-${session.quizVerdict.status}` : ""}`}
        role="status"
        aria-live="polite"
      >
        {session.quizVerdict?.status === "ok" ? "✓ " : session.quizVerdict?.status === "bad" ? "✗ " : ""}
        {session.quizVerdict?.text || speechHint || hintText() || t("quiz_hint")}
      </p>

      <div className="commit-row">
        <button className="btn btn-secondary" type="button" onClick={toggleQuizHint}>
          {session.quizHintShown ? t("hide_hint") : t("show_hint")}
        </button>
        <button
          className="btn btn-primary"
          type="button"
          onClick={onNext}
          disabled={!session.checkedCurrent && session.pathIndex >= session.path.length - 1}
        >
          {t("next")}
        </button>
      </div>

      <div className="btn-row center" style={{ marginTop: "var(--s-5)" }}>
        <button className="btn btn-quiet" type="button" onClick={goPrev} disabled={session.pathIndex <= 0}>
          {t("previous")}
        </button>
        <button className="btn btn-quiet" type="button" onClick={onSkip}>{t("skip")}</button>
        <button className="btn btn-quiet" type="button" onClick={() => { resetLive(); setInput(""); }}>
          {t("restart")}
        </button>
      </div>
    </section>
  );
}
