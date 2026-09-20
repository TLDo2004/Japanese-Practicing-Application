import {
  emptyStore,
  LEGACY_CAPACITOR_MIGRATION_VERSION,
  migrate,
  type ProgressStore,
} from "@jpa/core";

export type LegacyMigrationAction =
  | "already_completed"
  | "kept_expo_progress"
  | "migrated_from_legacy"
  | "no_legacy"
  | "malformed_legacy"
  | "empty_legacy";

export type LegacyMigrationDecision = {
  action: LegacyMigrationAction;
  /** Store that AsyncStorage / memory should use after this pass. */
  store: ProgressStore;
  /** Whether `jpa-progress-v1` should be written (migrated payload). */
  writeProgress: boolean;
  /** Always true after a successful decide pass — marker must be persisted. */
  writeMarker: boolean;
  markerVersion: number;
};

function storesEqual(a: ProgressStore, b: ProgressStore): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

/** True when the hydrated store differs from a fresh empty default. */
export function hasMeaningfulProgress(store: ProgressStore): boolean {
  return !storesEqual(store, emptyStore());
}

function parseProgressRaw(raw: string | null | undefined): {
  ok: boolean;
  malformed: boolean;
  store: ProgressStore;
} {
  if (raw == null || raw === "") {
    return { ok: false, malformed: false, store: emptyStore() };
  }
  try {
    const parsed = JSON.parse(raw) as unknown;
    const store = migrate(parsed);
    return { ok: hasMeaningfulProgress(store), malformed: false, store };
  } catch {
    return { ok: false, malformed: true, store: emptyStore() };
  }
}

function parseMarker(raw: string | null | undefined): number {
  if (raw == null || raw === "") return 0;
  const n = Number(raw);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Pure, idempotent Capacitor WebView localStorage → Expo AsyncStorage decision.
 *
 * Precedence:
 * 1. Marker already at current version → no destructive rerun
 * 2. Valid Expo AsyncStorage progress → keep Expo (even if legacy also exists)
 * 3. Expo empty + valid legacy → migrate legacy
 * 4. Malformed / empty legacy → keep empty Expo store, still set marker
 *
 * `jpa-lang` is intentionally ignored (not an Expo setting).
 */
export function decideLegacyCapacitorMigration(input: {
  markerRaw: string | null;
  asyncStorageRaw: string | null;
  legacyProgressRaw: string | null;
}): LegacyMigrationDecision {
  const markerVersion = LEGACY_CAPACITOR_MIGRATION_VERSION;
  const marker = parseMarker(input.markerRaw);

  if (marker >= markerVersion) {
    const existing = parseProgressRaw(input.asyncStorageRaw);
    return {
      action: "already_completed",
      store: existing.store,
      writeProgress: false,
      writeMarker: false,
      markerVersion,
    };
  }

  const expo = parseProgressRaw(input.asyncStorageRaw);
  if (expo.ok) {
    return {
      action: "kept_expo_progress",
      store: expo.store,
      writeProgress: false,
      writeMarker: true,
      markerVersion,
    };
  }

  const legacy = parseProgressRaw(input.legacyProgressRaw);
  if (legacy.malformed) {
    return {
      action: "malformed_legacy",
      store: emptyStore(),
      writeProgress: false,
      writeMarker: true,
      markerVersion,
    };
  }
  if (!legacy.ok) {
    const hadLegacyPayload =
      input.legacyProgressRaw != null && input.legacyProgressRaw !== "";
    return {
      action: hadLegacyPayload ? "empty_legacy" : "no_legacy",
      store: emptyStore(),
      writeProgress: false,
      writeMarker: true,
      markerVersion,
    };
  }

  return {
    action: "migrated_from_legacy",
    store: legacy.store,
    writeProgress: true,
    writeMarker: true,
    markerVersion,
  };
}
