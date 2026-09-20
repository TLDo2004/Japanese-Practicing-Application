import { describe, expect, it } from "vitest";
import { buildDeck } from "@jpa/practice";
import { BASIC } from "@jpa/kana";
import { shouldRecordSessionResult } from "@jpa/practice";
import { bothAtOnceLogicalKey, bothStepScript, oneAtATimeKeys } from "../lib/bothAtOnce";
import { learnContinueState, showPracticeContinue } from "../lib/continue";
import { toSessionSnapshot, restoreLiveFromSnapshot } from "./sessionSnapshot";
import type { SessionSnapshot } from "@jpa/core";

describe("Both-at-once vs one-at-a-time", () => {
  it("Both-at-once keeps one logical item across UI steps", () => {
    const deck = buildDeck({ script: "both", letters: BASIC.slice(0, 1), random: false });
    expect(deck).toHaveLength(1);
    expect(deck[0]!.key).toBe(BASIC[0]!.ro);
    expect(bothAtOnceLogicalKey(deck[0]!.key, 0)).toBe(deck[0]!.key);
    expect(bothAtOnceLogicalKey(deck[0]!.key, 1)).toBe(deck[0]!.key);
    expect(bothStepScript(0)).toBe("hira");
    expect(bothStepScript(1)).toBe("kata");
  });

  it("One-at-a-time / random uses separate keys", () => {
    const deck = buildDeck({ script: "hira", letters: BASIC.slice(0, 1), random: true });
    expect(deck.map((d) => d.key)).toEqual(oneAtATimeKeys(BASIC[0]!.ro));
  });
});

describe("Learn vs Practice Continue semantics", () => {
  it("Learn drill does not record session results", () => {
    expect(shouldRecordSessionResult(true)).toBe(false);
    expect(shouldRecordSessionResult(false)).toBe(true);
  });

  it("restore round-trip preserves session fields", () => {
    const snap = toSessionSnapshot({
      kind: "quiz",
      script: "hira",
      random: false,
      setId: "a",
      origin: "practice",
      usedKeys: ["a"],
      path: [{ ro: "a", prompt: "hira", key: "a" }],
      pathIndex: 0,
      results: { a: { first: "ok", missed: false } },
      title: "Test",
      done: false,
    });
    const restored = restoreLiveFromSnapshot(snap);
    expect(restored?.kind).toBe("quiz");
    expect(restored?.pathIndex).toBe(0);
    expect(restored?.usedKeys).toEqual(["a"]);
    expect(restored?.results.a?.first).toBe("ok");
    expect(restored?.setId).toBe("a");
    expect(restored?.done).toBe(false);
  });

  it("Continue helpers distinguish live practice vs start-hira", () => {
    const live: SessionSnapshot = {
      kind: "quiz",
      script: "hira",
      random: false,
      setId: "basic46",
      origin: "practice",
      used: ["a"],
      path: [{ ro: "a", prompt: "hira", key: "a" }],
      pathIndex: 0,
      results: {},
      view: "quiz",
      done: false,
      title: "Q",
    };
    expect(showPracticeContinue(live)).toBe(true);
    expect(learnContinueState(live)).toBe("live");
    expect(learnContinueState(null)).toBe("start-hira");
  });
});
