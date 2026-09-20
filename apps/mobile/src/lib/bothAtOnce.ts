/**
 * Both-at-once keeps one logical session item (deck key).
 * Steps 0/1 are UI-only — they must not invent new result keys.
 */
export function bothAtOnceLogicalKey(itemKey: string, _step: 0 | 1): string {
  return itemKey;
}

/** One-at-a-time / random mode uses separate keys per script. */
export function oneAtATimeKeys(ro: string): [string, string] {
  return [`${ro}-hira`, `${ro}-kata`];
}

export function bothStepScript(step: 0 | 1): "hira" | "kata" {
  return step === 0 ? "hira" : "kata";
}
