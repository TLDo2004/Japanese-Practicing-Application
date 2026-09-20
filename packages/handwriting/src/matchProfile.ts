/**
 * Optional matchInk diagnostics. Disabled by default (boolean check only).
 * Lifetime template-load counters stay on so reuse can be proven on device.
 */

export type MatchProfileSnapshot = {
  candidates: number;
  templatesConsidered: number;
  shiftedMetricsCalls: number;
  shiftedMetricsMs: number;
  dilateCalls: number;
  dilateCacheHits: number;
  dilateMs: number;
  geometryCalls: number;
  geometryMs: number;
  totalMs: number;
};

export type TemplateLoadStats = {
  loadCalls: number;
  loadCacheHits: number;
  unpackCalls: number;
};

function emptyProfile(): MatchProfileSnapshot {
  return {
    candidates: 0,
    templatesConsidered: 0,
    shiftedMetricsCalls: 0,
    shiftedMetricsMs: 0,
    dilateCalls: 0,
    dilateCacheHits: 0,
    dilateMs: 0,
    geometryCalls: 0,
    geometryMs: 0,
    totalMs: 0,
  };
}

let enabled = false;
let current = emptyProfile();
let loadCalls = 0;
let loadCacheHits = 0;
let unpackCalls = 0;

export function isMatchProfileEnabled(): boolean {
  return enabled;
}

export function beginMatchProfile(): void {
  enabled = true;
  current = emptyProfile();
}

export function endMatchProfile(): MatchProfileSnapshot {
  const snap = { ...current };
  enabled = false;
  return snap;
}

export function profileNow(): number {
  return typeof performance !== "undefined" ? performance.now() : Date.now();
}

export function profileAdd(
  field: keyof Omit<MatchProfileSnapshot, "totalMs">,
  n = 1,
): void {
  if (!enabled) return;
  current[field] += n;
}

export function profileSetCandidates(n: number): void {
  if (!enabled) return;
  current.candidates = n;
  current.templatesConsidered = n;
}

export function profileSetTotal(ms: number): void {
  if (!enabled) return;
  current.totalMs = ms;
}

export function recordTemplateLoad(hit: boolean): void {
  loadCalls += 1;
  if (hit) loadCacheHits += 1;
}

export function recordTemplateUnpack(): void {
  unpackCalls += 1;
}

export function getTemplateLoadStats(): TemplateLoadStats {
  return { loadCalls, loadCacheHits, unpackCalls };
}

export function resetTemplateLoadStats(): void {
  loadCalls = 0;
  loadCacheHits = 0;
  unpackCalls = 0;
}
