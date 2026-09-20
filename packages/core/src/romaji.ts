export function normalizeRomaji(s: string | null | undefined): string {
  return String(s || "").trim().toLowerCase().replace(/\s+/g, "");
}
