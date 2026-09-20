import { describe, expect, it } from "vitest";
import { BASIC, lettersFor } from "@jpa/kana";
import {
  atFrontier,
  buildDeck,
  dedupeMissedByRo,
  isLiveSession,
  learnContinueKind,
  learnedScriptsForPrompt,
  missedLetters,
  nextRequiresCheck,
  pickRandom,
  practiceContinueVisible,
  quizHintText,
  quizModeMeta,
  recordAttempt,
  remainingList,
  resolveLookalikesChoice,
  restoreSessionKind,
  restoreSessionSetId,
  romajiMatches,
  shouldRecordSessionResult,
  summaryCounts,
  writeModeMeta,
  writingCheckOutcome,
} from "./index";

const letters = lettersFor("a");

describe("buildDeck", () => {
  it("uses script as prompt and ro as key when not random", () => {
    const deck = buildDeck({ script: "kata", letters, random: false });
    expect(deck.map((d) => d.key)).toEqual(["a", "i", "u", "e", "o"]);
    expect(deck.every((d) => d.prompt === "kata")).toBe(true);
  });

  it("splits mixed/random decks into hira and kata items", () => {
    const deck = buildDeck({ script: "both", letters: letters.slice(0, 1), random: true });
    expect(deck).toHaveLength(2);
    expect(deck[0]).toMatchObject({ ro: "a", prompt: "hira", key: "a-hira" });
    expect(deck[1]).toMatchObject({ ro: "a", prompt: "kata", key: "a-kata" });
  });
});

describe("selection", () => {
  it("picks remaining items with an injected RNG", () => {
    const deck = buildDeck({ script: "hira", letters, random: false });
    const used = new Set(["a", "i"]);
    const pool = remainingList(deck, used);
    expect(pool.map((p) => p.ro)).toEqual(["u", "e", "o"]);
    const first = pickRandom(pool, () => 0);
    const last = pickRandom(pool, () => 0.999);
    expect(first?.ro).toBe("u");
    expect(last?.ro).toBe("o");
    expect(pickRandom([], () => 0)).toBeNull();
  });
});

describe("romajiMatches", () => {
  it("accepts aliases including dji/dzu/wo and reverse lookup", () => {
    expect(romajiMatches("shi", "shi")).toBe(true);
    expect(romajiMatches("SI", "shi")).toBe(true);
    expect(romajiMatches("di", "dji")).toBe(true);
    expect(romajiMatches("ji", "dji")).toBe(true);
    expect(romajiMatches("o", "wo")).toBe(true);
    expect(romajiMatches("wo", "o")).toBe(true);
    expect(romajiMatches("zu", "dzu")).toBe(true);
    expect(romajiMatches("", "a")).toBe(false);
    expect(romajiMatches("ka", "a")).toBe(false);
  });

  it("builds the one-character quiz hint", () => {
    expect(quizHintText("a")).toBe("a");
    expect(quizHintText("shi")).toBe("s…");
  });
});

describe("scoring", () => {
  it("locks first attempt and flags any later miss", () => {
    let results = recordAttempt({}, "a", true);
    results = recordAttempt(results, "a", false);
    expect(results.a).toEqual({ first: "ok", missed: true });
    results = recordAttempt({}, "a", false);
    results = recordAttempt(results, "a", true);
    expect(results.a).toEqual({ first: "bad", missed: true });
  });

  it("treats skip as an incorrect recorded attempt", () => {
    const results = recordAttempt({}, "a-hira", false);
    expect(results["a-hira"].first).toBe("bad");
    expect(results["a-hira"].missed).toBe(true);
  });

  it("does not write session results during learn drill", () => {
    expect(shouldRecordSessionResult(true)).toBe(false);
    expect(shouldRecordSessionResult(false)).toBe(true);
  });

  it("empty writing pads do not count as a check", () => {
    expect(writingCheckOutcome([{ status: "empty" }, { status: "empty" }])).toBe("empty");
    expect(writingCheckOutcome([{ status: "ok" }, { status: "empty" }])).toBe("ok");
    expect(writingCheckOutcome([{ status: "ok" }, { status: "bad" }])).toBe("bad");
  });

  it("summary uses first-ok and missed list length", () => {
    const results = {
      a: { first: "ok" as const, missed: false },
      i: { first: "bad" as const, missed: true },
      u: { first: "ok" as const, missed: true },
    };
    expect(summaryCounts(results, 9, 2)).toEqual({ total: 3, firstOk: 2, missed: 2 });
    expect(summaryCounts({}, 4, 0)).toEqual({ total: 4, firstOk: 0, missed: 0 });
  });

  it("missed letters then practice-missed dedupe by ro", () => {
    const deck = buildDeck({ script: "both", letters: BASIC.slice(0, 2), random: true });
    const path = [deck[0], deck[1], deck[2]];
    const results = {
      "a-hira": { first: "bad" as const, missed: true },
      "a-kata": { first: "bad" as const, missed: true },
      "i-hira": { first: "bad" as const, missed: true },
    };
    const missed = missedLetters(results, path, deck, "both");
    expect(missed.map((m) => m.key)).toEqual(["a-hira", "a-kata", "i-hira"]);
    expect(dedupeMissedByRo(missed).map((l) => l.ro)).toEqual(["a", "i"]);
  });

  it("marks both scripts learned only when prompt/session is both", () => {
    expect(learnedScriptsForPrompt("hira", "both")).toEqual(["hira"]);
    expect(learnedScriptsForPrompt("both", "both")).toEqual(["hira", "kata"]);
    expect(learnedScriptsForPrompt("kata", "hira")).toEqual(["kata"]);
  });
});

describe("session rules", () => {
  it("requires Check at the frontier except learn drill", () => {
    expect(atFrontier(2, 3)).toBe(true);
    expect(nextRequiresCheck({ learnDrill: false, atFrontier: true, checkedCurrent: false })).toBe(true);
    expect(nextRequiresCheck({ learnDrill: false, atFrontier: true, checkedCurrent: true })).toBe(false);
    expect(nextRequiresCheck({ learnDrill: true, atFrontier: true, checkedCurrent: false })).toBe(false);
  });

  it("maps writing/quiz mode ids, with mixed reading always random", () => {
    expect(writeModeMeta("random")).toEqual({ script: "both", random: true });
    expect(writeModeMeta("lookalikes")).toEqual({ script: "hira", random: false });
    expect(quizModeMeta("both")).toEqual({ script: "both", random: true });
    expect(quizModeMeta("nope")).toEqual({ script: "hira", random: false });
  });

  it("lookalikes variants always persist setId lookalikes", () => {
    expect(resolveLookalikesChoice("lookalikes-hira")).toEqual({
      script: "hira",
      random: false,
      setId: "lookalikes",
    });
    expect(resolveLookalikesChoice("lookalikes-random")).toEqual({
      script: "both",
      random: true,
      setId: "lookalikes",
    });
    expect(resolveLookalikesChoice("basic46")).toBeNull();
  });

  it("Continue is live on Learn even as a fallback card; Practice only when live", () => {
    const live = { done: false, path: [{ ro: "a" }] };
    const done = { done: true, path: [{ ro: "a" }] };
    expect(isLiveSession(live)).toBe(true);
    expect(learnContinueKind(live)).toBe("live");
    expect(learnContinueKind(done)).toBe("start-hira");
    expect(practiceContinueVisible(live)).toBe(true);
    expect(practiceContinueVisible(done)).toBe(false);
    expect(restoreSessionKind("quiz")).toBe("quiz");
    expect(restoreSessionKind("write")).toBe("write");
    expect(restoreSessionSetId(undefined)).toBe("full71");
  });

  it("Both-at-once is one logical item even when two scripts are judged", () => {
    const outcome = writingCheckOutcome([{ status: "ok" }, { status: "ok" }]);
    expect(outcome).toBe("ok");
    const mixed = writingCheckOutcome([{ status: "ok" }, { status: "bad" }]);
    expect(mixed).toBe("bad");
    const results = recordAttempt({}, "a", mixed === "ok");
    expect(Object.keys(results)).toEqual(["a"]);
    expect(results.a).toEqual({ first: "bad", missed: true });
    expect(learnedScriptsForPrompt("both", "both")).toEqual(["hira", "kata"]);
  });
});
