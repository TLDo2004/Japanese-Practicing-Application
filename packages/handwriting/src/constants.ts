export const MASK_SIZE = 56;

export const INK_ALPHA_THRESHOLD = 24;

export const BASE_RO: Record<string, string> = {
  ga: "ka", gi: "ki", gu: "ku", ge: "ke", go: "ko",
  za: "sa", ji: "shi", zu: "su", ze: "se", zo: "so",
  da: "ta", dji: "chi", dzu: "tsu", de: "te", do: "to",
  ba: "ha", bi: "hi", bu: "fu", be: "he", bo: "ho",
  pa: "ha", pi: "hi", pu: "fu", pe: "he", po: "ho",
};

export const HORIZ_SLANT = new Set(["shi", "n", "ji"]);
export const VERT_SLANT = new Set(["tsu", "so", "dzu"]);
