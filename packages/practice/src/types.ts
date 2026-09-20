import type { Letter } from "@jpa/kana";

export type PromptScript = "hira" | "kata" | "both";

export type DeckItem = Letter & {
  prompt: PromptScript;
  key: string;
};

export type DeckMode = {
  script: PromptScript;
  letters: readonly Letter[];
  random: boolean;
};

export type RandomSource = () => number;

export type AttemptResult = {
  first: "ok" | "bad" | null;
  missed: boolean;
};

export type WriteModeId = "hira" | "kata" | "both" | "random" | "lookalikes";
export type QuizModeId = "hira" | "kata" | "both";
