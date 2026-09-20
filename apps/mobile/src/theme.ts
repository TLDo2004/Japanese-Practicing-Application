/**
 * Shared visual language with apps/web — the same tokens, expressed as plain
 * values because React Native has no CSS custom properties.
 *
 * Neutral foundation + restrained pastel families for script/mode identity.
 */
export const colors = {
  background: "#f7f5f0",
  surface: "#ffffff",
  surfaceSubtle: "#f0eee8",
  text: "#1d1c19",
  textMuted: "#706d66",
  border: "#ddd9d0",
  borderStrong: "#c9c4b8",

  /** Primary CTA — soft terracotta red (aligned with pastel-red accent). */
  primary: "#c45b5b",
  primaryPressed: "#a84a4a",
  primaryTint: "#f5e8e8",
  onPrimary: "#ffffff",

  positive: "#5a8f6a",
  positiveTint: "#e8f2ea",
  positiveText: "#2f5a3c",

  /** Pastel families */
  greenSurface: "#e8f2ea",
  greenAccent: "#5a8f6a",
  greenText: "#2f5a3c",

  blueSurface: "#e6eef6",
  blueAccent: "#5b7fa8",
  blueText: "#2f4a6a",

  yellowSurface: "#f5f0e0",
  yellowAccent: "#b89a4a",
  yellowText: "#6b5a28",

  redSurface: "#f5e8e8",
  redAccent: "#c45b5b",
  redText: "#7a3a3a",

  violetSurface: "#eee8f4",
  violetAccent: "#8b6fa8",
  violetText: "#4a3a6a",
} as const;

export const fonts = {
  display: "Fraunces_700Bold",
  displayMed: "Fraunces_500Medium",
  body: "IBMPlexSans_400Regular",
  bodyMed: "IBMPlexSans_500Medium",
  bodySemi: "IBMPlexSans_600SemiBold",
  jp: "NotoSansJP_400Regular",
  jpMed: "NotoSansJP_500Medium",
  jpBold: "NotoSansJP_700Bold",
} as const;

export const space = {
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 24,
  6: 32,
  7: 48,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 18,
} as const;

export const touch = 44;
