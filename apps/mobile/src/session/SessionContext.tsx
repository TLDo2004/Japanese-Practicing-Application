import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { ALL, BY_RO, lettersFor, type Letter } from "@jpa/kana";
import {
  atFrontier,
  buildDeck,
  learnedScriptsForPrompt,
  missedLetters,
  nextRequiresCheck,
  pickRandom,
  promptOf,
  quizHintText,
  quizModeMeta,
  recordAttempt,
  remainingList,
  resolveLookalikesChoice,
  romajiMatches,
  shouldRecordSessionResult,
  showHiraPad,
  showKataPad,
  summaryCounts,
  writeModeMeta,
  type AttemptResult,
  type DeckItem,
  type PromptScript,
} from "@jpa/practice";
import { setLabel } from "../lib/sets";
import type { ProgressStore } from "@jpa/core";
import { bumpWeakEntry, learnedKey, t } from "@jpa/core";
import { usePlatform } from "../platform/PlatformContext";
import { restoreLiveFromSnapshot, toSessionSnapshot, type RestoredSession } from "../platform/sessionSnapshot";

export type SessionKind = "write" | "quiz";
export type SessionOrigin = "learn" | "practice";

export type QuizVerdict = {
  status: "ok" | "bad";
  text: string;
};

export type LiveSession = {
  kind: SessionKind;
  origin: SessionOrigin;
  learnDrill: boolean;
  learnScript: "hira" | "kata";
  script: PromptScript;
  random: boolean;
  setId: string;
  title: string;
  letters: Letter[];
  deck: DeckItem[];
  path: DeckItem[];
  pathIndex: number;
  usedKeys: string[];
  results: Record<string, AttemptResult>;
  checkedCurrent: boolean;
  guideHidden: boolean;
  jumpOpen: boolean;
  quizHintShown: boolean;
  quizVerdict: QuizVerdict | null;
  writeNote: string;
  completed: boolean;
  hydrated: boolean;
};

type BeginWriteInput = {
  script: PromptScript;
  random: boolean;
  setId: string;
  title: string;
  letters?: Letter[];
  origin?: SessionOrigin;
};

type BeginQuizInput = BeginWriteInput;

function usedSet(session: LiveSession): Set<string> {
  return new Set(session.usedKeys);
}

function currentOf(session: LiveSession | null): DeckItem | null {
  if (!session || session.pathIndex < 0) return null;
  return session.path[session.pathIndex] || null;
}

function remainingHint(session: LiveSession): string {
  if (session.learnDrill) return t("trace_hint");
  const left = session.deck.length - session.usedKeys.length;
  if (!left) return t("all_done");
  return left === 1 ? t("remaining_one") : t("remaining_many", { n: left });
}

function applyLetter(session: LiveSession, letter: DeckItem): LiveSession {
  const usedKeys = session.learnDrill
    ? session.usedKeys
    : session.usedKeys.includes(letter.key)
      ? session.usedKeys
      : [...session.usedKeys, letter.key];
  return {
    ...session,
    usedKeys,
    checkedCurrent: false,
    quizHintShown: false,
    quizVerdict: null,
    writeNote: "",
    path: session.path,
    completed: false,
    hydrated: false,
  };
}

function liveFromRestored(restored: RestoredSession): LiveSession {
  return {
    kind: restored.kind,
    origin: restored.origin,
    learnDrill: false,
    learnScript: restored.script === "kata" ? "kata" : "hira",
    script: restored.script,
    random: restored.random,
    setId: restored.setId,
    title: restored.title,
    letters: restored.letters,
    deck: restored.deck,
    path: restored.path,
    pathIndex: restored.pathIndex,
    usedKeys: restored.usedKeys,
    results: restored.results,
    checkedCurrent: false,
    guideHidden: true,
    jumpOpen: false,
    quizHintShown: false,
    quizVerdict: null,
    writeNote: "",
    completed: restored.done,
    hydrated: true,
  };
}

function snapshotFromLive(session: LiveSession) {
  return toSessionSnapshot({
    kind: session.kind,
    script: session.script,
    random: session.random,
    setId: session.setId,
    origin: session.origin,
    usedKeys: session.usedKeys,
    path: session.path,
    pathIndex: session.pathIndex,
    results: session.results,
    title: session.title,
    done: session.completed,
  });
}

function persistSession(
  session: LiveSession,
  save: (patch: Partial<ProgressStore>) => ProgressStore,
) {
  if (session.learnDrill) return;
  save({
    lastSession: snapshotFromLive(session),
    lastActivity: {
      kind: session.kind,
      script: session.script,
      setId: session.setId,
      title: session.title,
      origin: session.origin,
    },
  });
}

function applyAttemptProgress(
  save: (patch: Partial<ProgressStore>) => ProgressStore,
  store: ProgressStore,
  input: {
    key: string;
    ok: boolean;
    scripts: Array<"hira" | "kata">;
    ro: string;
  },
) {
  const weak = { ...store.weak, [input.key]: bumpWeakEntry(store.weak[input.key], input.ok) };
  const learned = { ...store.learned };
  if (input.ok && input.ro) {
    input.scripts.forEach((script) => {
      learned[learnedKey(script, input.ro)] = true;
    });
  }
  save({ weak, learned });
}

type SessionValue = {
  session: LiveSession | null;
  current: DeckItem | null;
  beginWrite: (input: BeginWriteInput) => void;
  beginQuiz: (input: BeginQuizInput) => void;
  beginLearnDrill: (script: "hira" | "kata", letter: Letter) => void;
  handleSetChoice: (setId: string, pending: { kind: "write" | "quiz"; mode: string }) => "write" | "quiz";
  goNext: (force?: boolean) => "blocked" | "item" | "summary";
  goPrev: () => void;
  resetLive: () => void;
  checkQuiz: (input: string) => void;
  skipQuiz: () => "item" | "summary";
  toggleQuizHint: () => void;
  toggleGuide: () => void;
  toggleJump: () => void;
  jumpToRo: (ro: string) => void;
  recordWriteCheck: (outcome: "empty" | "ok" | "bad") => void;
  continueLast: (origin: SessionOrigin) => "write" | "quiz" | null;
  clearWriteNote: () => void;
  retrySummary: () => "write" | "quiz" | null;
  practiceMissed: () => "write" | "quiz" | null;
  clearSession: () => void;
  hintText: () => string;
  progressLabel: () => string;
  progressCounts: () => { n: number; total: number };
  summary: () => {
    total: number;
    firstOk: number;
    missed: DeckItem[];
    stats: string;
    accuracy: number;
  } | null;
};

const SessionContext = createContext<SessionValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const { store, save } = usePlatform();
  const [session, setSession] = useState<LiveSession | null>(() => {
    const restored = restoreLiveFromSnapshot(store.lastSession);
    return restored ? liveFromRestored(restored) : null;
  });

  const current = currentOf(session);

  useEffect(() => {
    if (!session || session.learnDrill) return;
    persistSession(session, save);
  }, [session, save]);

  const startWrite = useCallback((input: BeginWriteInput, extra?: Partial<LiveSession>) => {
    const letters = input.letters || lettersFor(input.setId);
    const deck = buildDeck({
      script: input.script,
      letters,
      random: input.random,
    });
    const first = pickRandom(deck);
    const path = first ? [first] : [];
    const next: LiveSession = {
      kind: "write",
      origin: input.origin || "practice",
      learnDrill: false,
      learnScript: input.script === "kata" ? "kata" : "hira",
      script: input.script,
      random: input.random,
      setId: input.setId,
      title: input.setId === "lookalikes" ? t("title_look") : input.title,
      letters,
      deck,
      path,
      pathIndex: first ? 0 : -1,
      usedKeys: first && !extra?.learnDrill ? [first.key] : [],
      results: {},
      checkedCurrent: false,
      guideHidden: extra?.learnDrill ? false : true,
      jumpOpen: false,
      quizHintShown: false,
      quizVerdict: null,
      writeNote: "",
      completed: false,
      hydrated: false,
      ...extra,
    };
    if (extra?.learnDrill && extra.path) {
      const letter = extra.path[extra.pathIndex || 0];
      next.path = extra.path;
      next.pathIndex = extra.pathIndex ?? 0;
      next.usedKeys = [];
      next.guideHidden = false;
      if (letter) Object.assign(next, applyLetter({ ...next, learnDrill: true }, letter));
    }
    setSession(next);
  }, []);

  const beginWrite = useCallback((input: BeginWriteInput) => {
    startWrite(input);
  }, [startWrite]);

  const beginQuiz = useCallback((input: BeginQuizInput) => {
    const letters = input.letters || lettersFor(input.setId);
    const deck = buildDeck({
      script: input.script,
      letters,
      random: input.random,
    });
    const first = pickRandom(deck);
    setSession({
      kind: "quiz",
      origin: input.origin || "practice",
      learnDrill: false,
      learnScript: "hira",
      script: input.script,
      random: input.random,
      setId: input.setId,
      title: input.title,
      letters,
      deck,
      path: first ? [first] : [],
      pathIndex: first ? 0 : -1,
      usedKeys: first ? [first.key] : [],
      results: {},
      checkedCurrent: false,
      guideHidden: true,
      jumpOpen: false,
      quizHintShown: false,
      quizVerdict: null,
      writeNote: "",
      completed: false,
      hydrated: false,
    });
  }, []);

  const beginLearnDrill = useCallback((script: "hira" | "kata", letter: Letter) => {
    const deck = buildDeck({ script, letters: ALL, random: false });
    const pathIndex = Math.max(0, deck.findIndex((item) => item.ro === letter.ro));
    startWrite({
      script,
      random: false,
      setId: "all",
      title: script === "hira" ? t("hiragana") : t("katakana"),
      letters: ALL,
      origin: "learn",
    }, {
      learnDrill: true,
      learnScript: script,
      path: deck,
      pathIndex,
      guideHidden: false,
    });
  }, [startWrite]);

  const handleSetChoice = useCallback((
    setId: string,
    pending: { kind: "write" | "quiz"; mode: string },
  ): "write" | "quiz" => {
    if (pending.kind === "quiz") {
      const meta = quizModeMeta(pending.mode);
      const titleKey = pending.mode === "kata"
        ? "title_read_kata"
        : pending.mode === "both"
          ? "title_read_both"
          : "title_read_hira";
      beginQuiz({
        script: meta.script,
        random: meta.random,
        setId,
        title: `${t(titleKey)} · ${setLabel(setId)}`,
        origin: "practice",
      });
      return "quiz";
    }
    const look = resolveLookalikesChoice(setId) || (pending.mode === "lookalikes"
      ? resolveLookalikesChoice(setId.startsWith("lookalikes") ? setId : "lookalikes-hira")
      : null);
    if (pending.mode === "lookalikes" || look) {
      const resolved = look || { script: "hira" as const, random: false, setId: "lookalikes" as const };
      beginWrite({
        script: resolved.script,
        random: resolved.random,
        setId: "lookalikes",
        title: t("title_look"),
        origin: "practice",
      });
      return "write";
    }
    const meta = writeModeMeta(pending.mode);
    const titleKey = pending.mode === "kata"
      ? "title_write_kata"
      : pending.mode === "both"
        ? "title_write_both"
        : pending.mode === "random"
          ? "title_write_random"
          : "title_write_hira";
    beginWrite({
      script: meta.script,
      random: meta.random,
      setId,
      title: `${t(titleKey)} · ${setLabel(setId)}`,
      origin: "practice",
    });
    return "write";
  }, [beginQuiz, beginWrite]);

  const goNext = useCallback((force = false): "blocked" | "item" | "summary" => {
    if (!session) return "blocked";
    if (session.learnDrill) {
      if (session.pathIndex >= session.deck.length - 1) return "blocked";
      const pathIndex = session.pathIndex + 1;
      const letter = session.path[pathIndex];
      if (!letter) return "blocked";
      setSession(applyLetter({ ...session, pathIndex }, letter));
      return "item";
    }
    if (!force && nextRequiresCheck({
      learnDrill: false,
      atFrontier: atFrontier(session.pathIndex, session.path.length),
      checkedCurrent: session.checkedCurrent,
    })) {
      setSession({
        ...session,
        writeNote: session.kind === "quiz" ? t("check_first_quiz") : t("check_first_write"),
      });
      return "blocked";
    }
    if (session.pathIndex < session.path.length - 1) {
      const pathIndex = session.pathIndex + 1;
      const letter = session.path[pathIndex];
      if (!letter) return "blocked";
      setSession(applyLetter({ ...session, pathIndex }, letter));
      return "item";
    }
    const pool = remainingList(session.deck, usedSet(session));
    const letter = pickRandom(pool);
    if (!letter) {
      setSession({ ...session, completed: true });
      return "summary";
    }
    const path = [...session.path, letter];
    setSession(applyLetter({ ...session, path, pathIndex: path.length - 1 }, letter));
    return "item";
  }, [session]);

  const goPrev = useCallback(() => {
    setSession((prev) => {
      if (!prev || prev.pathIndex <= 0) return prev;
      const pathIndex = prev.pathIndex - 1;
      const letter = prev.path[pathIndex];
      if (!letter) return prev;
      return applyLetter({ ...prev, pathIndex }, letter);
    });
  }, []);

  const resetLive = useCallback(() => {
    setSession((prev) => {
      if (!prev || prev.learnDrill) return prev;
      const first = pickRandom(prev.deck);
      return {
        ...prev,
        path: first ? [first] : [],
        pathIndex: first ? 0 : -1,
        usedKeys: first ? [first.key] : [],
        results: {},
        checkedCurrent: false,
        quizHintShown: false,
        quizVerdict: null,
        writeNote: "",
        jumpOpen: false,
        completed: false,
        hydrated: false,
      };
    });
  }, []);

  const checkQuiz = useCallback((input: string) => {
    if (!session || session.kind !== "quiz") return;
    const letter = currentOf(session);
    if (!letter) return;
    const ok = romajiMatches(input, letter.ro);
    applyAttemptProgress(save, store, {
      key: letter.key,
      ok,
      scripts: learnedScriptsForPrompt(letter.prompt, session.script),
      ro: letter.ro,
    });
    const results = recordAttempt({ ...session.results }, letter.key, ok);
    const left = remainingList(session.deck, new Set(
      session.usedKeys.includes(letter.key) ? session.usedKeys : [...session.usedKeys, letter.key],
    )).length;
    setSession({
      ...session,
      results,
      checkedCurrent: true,
      quizVerdict: {
        status: ok ? "ok" : "bad",
        text: ok ? t("quiz_correct", { ro: letter.ro }) : t("quiz_answer", { ro: letter.ro }),
      },
      writeNote: ok
        ? (left ? t("quiz_ok_next") : t("quiz_ok_finish"))
        : t("quiz_bad_hint"),
    });
  }, [session, save, store]);

  const skipQuiz = useCallback((): "item" | "summary" => {
    if (!session || session.kind !== "quiz") return "item";
    const letter = currentOf(session);
    if (!letter) return "item";
    applyAttemptProgress(save, store, {
      key: letter.key,
      ok: false,
      scripts: learnedScriptsForPrompt(letter.prompt, session.script),
      ro: letter.ro,
    });
    const results = recordAttempt({ ...session.results }, letter.key, false);
    const nextSession = { ...session, results, checkedCurrent: true };
    const pool = remainingList(nextSession.deck, usedSet(nextSession));
    if (nextSession.pathIndex < nextSession.path.length - 1) {
      const pathIndex = nextSession.pathIndex + 1;
      const nextLetter = nextSession.path[pathIndex];
      if (nextLetter) setSession(applyLetter({ ...nextSession, pathIndex }, nextLetter));
      return "item";
    }
    const picked = pickRandom(pool.filter((item) => item.key !== letter.key));
    if (!picked) {
      setSession({ ...nextSession, completed: true });
      return "summary";
    }
    const path = [...nextSession.path, picked];
    setSession(applyLetter({ ...nextSession, path, pathIndex: path.length - 1 }, picked));
    return "item";
  }, [session, save, store]);

  const toggleQuizHint = useCallback(() => {
    setSession((prev) => {
      if (!prev) return prev;
      const letter = currentOf(prev);
      if (!letter) return prev;
      const quizHintShown = !prev.quizHintShown;
      return {
        ...prev,
        quizHintShown,
        writeNote: quizHintShown
          ? t("quiz_hint_reveal", { ro: quizHintText(letter.ro) })
          : remainingHint(prev),
      };
    });
  }, []);

  const toggleGuide = useCallback(() => {
    setSession((prev) => prev ? { ...prev, guideHidden: !prev.guideHidden } : prev);
  }, []);

  const toggleJump = useCallback(() => {
    setSession((prev) => prev ? { ...prev, jumpOpen: !prev.jumpOpen } : prev);
  }, []);

  const jumpToRo = useCallback((ro: string) => {
    setSession((prev) => {
      if (!prev) return prev;
      const idxs = prev.path.map((item, i) => (item.ro === ro ? i : -1)).filter((i) => i >= 0);
      if (!idxs.length) return prev;
      const cur = currentOf(prev);
      let idx = idxs[idxs.length - 1] ?? 0;
      if (cur && cur.ro === ro && idxs.length > 1) {
        const pos = idxs.indexOf(prev.pathIndex);
        idx = idxs[(pos + 1) % idxs.length] ?? idx;
      }
      const letter = prev.path[idx];
      if (!letter) return prev;
      return applyLetter({ ...prev, pathIndex: idx }, letter);
    });
  }, []);

  const recordWriteCheck = useCallback((outcome: "empty" | "ok" | "bad") => {
    if (!session) return;
    const letter = currentOf(session);
    if (outcome === "empty") {
      setSession({ ...session, writeNote: t("write_then_check") });
      return;
    }
    const ok = outcome === "ok";
    if (letter) {
      applyAttemptProgress(save, store, {
        key: letter.key,
        ok,
        scripts: session.learnDrill
          ? [session.learnScript]
          : learnedScriptsForPrompt(letter.prompt, session.script),
        ro: letter.ro,
      });
    }
    const results = letter && shouldRecordSessionResult(session.learnDrill)
      ? recordAttempt({ ...session.results }, letter.key, ok)
      : session.results;
    const left = remainingList(session.deck, usedSet(session)).length;
    const writeNote = session.learnDrill
      ? (ok ? t("drill_ok") : t("drill_bad"))
      : ok
        ? (left ? t("write_ok_next") : t("write_ok_finish"))
        : t("write_bad");
    setSession({
      ...session,
      results,
      checkedCurrent: true,
      writeNote,
    });
  }, [session, save, store]);

  const continueLast = useCallback((origin: SessionOrigin): "write" | "quiz" | null => {
    const restored = restoreLiveFromSnapshot(store.lastSession);
    if (!restored || restored.done) return null;
    setSession({
      ...liveFromRestored(restored),
      origin,
      completed: false,
      hydrated: false,
    });
    return restored.kind;
  }, [store.lastSession]);

  const clearWriteNote = useCallback(() => {
    setSession((prev) => prev ? { ...prev, writeNote: "", checkedCurrent: false } : prev);
  }, []);

  const snapshotForRetry = useCallback((missedOnly: boolean) => {
    if (!session) return null;
    const missed = missedLetters(session.results, session.path, session.deck, session.script);
    const letters = missedOnly
      ? missed.reduce<Letter[]>((acc, item) => {
        if (acc.some((l) => l.ro === item.ro)) return acc;
        const base = BY_RO[item.ro];
        if (base) acc.push(base);
        return acc;
      }, [])
      : session.letters;
    if (missedOnly && !letters.length) return null;
    const title = missedOnly
      ? t(session.kind === "quiz" ? "missed_reading" : "missed_writing")
      : session.title;
    return { letters, title };
  }, [session]);

  const retrySummary = useCallback((): "write" | "quiz" | null => {
    if (!session) return null;
    const snap = snapshotForRetry(false);
    if (!snap) return null;
    if (session.kind === "quiz") {
      beginQuiz({
        script: session.script,
        random: session.random,
        setId: session.setId,
        title: snap.title,
        letters: snap.letters,
        origin: session.origin,
      });
      return "quiz";
    }
    beginWrite({
      script: session.script,
      random: session.random,
      setId: session.setId,
      title: snap.title,
      letters: snap.letters,
      origin: session.origin,
    });
    return "write";
  }, [beginQuiz, beginWrite, session, snapshotForRetry]);

  const practiceMissed = useCallback((): "write" | "quiz" | null => {
    if (!session) return null;
    const snap = snapshotForRetry(true);
    if (!snap) return null;
    if (session.kind === "quiz") {
      beginQuiz({
        script: session.script,
        random: session.random,
        setId: session.setId,
        title: snap.title,
        letters: snap.letters,
        origin: session.origin,
      });
      return "quiz";
    }
    beginWrite({
      script: session.script,
      random: session.random,
      setId: session.setId,
      title: snap.title,
      letters: snap.letters,
      origin: session.origin,
    });
    return "write";
  }, [beginQuiz, beginWrite, session, snapshotForRetry]);

  const clearSession = useCallback(() => {
    setSession(null);
    save({ lastSession: null });
  }, [save]);

  const hintText = useCallback(() => {
    if (!session) return "";
    if (session.writeNote) return session.writeNote;
    return remainingHint(session);
  }, [session]);

  const progressCounts = useCallback(() => {
    if (!session) return { n: 0, total: 0 };
    if (session.learnDrill) return { n: session.pathIndex + 1, total: session.deck.length };
    return { n: session.usedKeys.length, total: session.deck.length };
  }, [session]);

  const progressLabel = useCallback(() => {
    if (!session) return "";
    const { n, total } = progressCounts();
    return `${n} / ${total}`;
  }, [session, progressCounts]);

  const summary = useCallback(() => {
    if (!session) return null;
    const missed = missedLetters(session.results, session.path, session.deck, session.script);
    const counts = summaryCounts(session.results, session.usedKeys.length, missed.length);
    return {
      ...counts,
      missed,
      accuracy: counts.total ? Math.round((counts.firstOk / counts.total) * 100) : 0,
      stats: counts.total
        ? t("summary_first_try", { ok: counts.firstOk, total: counts.total })
        : t("summary_none"),
    };
  }, [session]);

  const value = useMemo<SessionValue>(() => ({
    session,
    current,
    beginWrite,
    beginQuiz,
    beginLearnDrill,
    handleSetChoice,
    goNext,
    goPrev,
    resetLive,
    checkQuiz,
    skipQuiz,
    toggleQuizHint,
    toggleGuide,
    toggleJump,
    jumpToRo,
    recordWriteCheck,
    continueLast,
    clearWriteNote,
    retrySummary,
    practiceMissed,
    clearSession,
    hintText,
    progressLabel,
    progressCounts,
    summary,
  }), [
    session, current, beginWrite, beginQuiz, beginLearnDrill, handleSetChoice,
    goNext, goPrev, resetLive, checkQuiz, skipQuiz, toggleQuizHint, toggleGuide, toggleJump,
    jumpToRo, recordWriteCheck, continueLast, clearWriteNote, retrySummary, practiceMissed, clearSession,
    hintText, progressLabel, progressCounts, summary,
  ]);

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used within SessionProvider");
  return ctx;
}

export function currentPrompt(session: LiveSession | null, current: DeckItem | null): PromptScript {
  return promptOf(current, session?.script || "hira");
}

export { showHiraPad, showKataPad };
