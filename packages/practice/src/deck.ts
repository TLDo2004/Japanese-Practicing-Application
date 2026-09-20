import type { DeckItem, DeckMode, PromptScript, RandomSource } from "./types";

export function buildDeck(m: DeckMode): DeckItem[] {
  if (m.random) {
    return m.letters.flatMap((l) => [
      { ...l, prompt: "hira" as const, key: `${l.ro}-hira` },
      { ...l, prompt: "kata" as const, key: `${l.ro}-kata` },
    ]);
  }
  return m.letters.map((l) => ({ ...l, prompt: m.script, key: l.ro }));
}

export function remainingList(deck: readonly DeckItem[], used: ReadonlySet<string>): DeckItem[] {
  return deck.filter((item) => !used.has(item.key));
}

export function pickRandom(pool: readonly DeckItem[], random: RandomSource = Math.random): DeckItem | null {
  if (!pool.length) return null;
  return pool[Math.floor(random() * pool.length)] as DeckItem;
}

export function promptOf(item: DeckItem | null | undefined, fallback: PromptScript): PromptScript {
  return item ? item.prompt : fallback;
}

export function showHiraPad(prompt: PromptScript): boolean {
  return prompt === "hira" || prompt === "both";
}

export function showKataPad(prompt: PromptScript): boolean {
  return prompt === "kata" || prompt === "both";
}
