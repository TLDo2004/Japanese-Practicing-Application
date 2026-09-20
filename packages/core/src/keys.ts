/** localStorage / AsyncStorage key for progress. Browser binding is not in this package. */
export const STORAGE_KEY = "jpa-progress-v1";

/**
 * Legacy UI-language key from the bilingual builds. The UI is English-only, so
 * this value is never read or written any more. It is named here so existing
 * installs keep whatever they stored instead of having it cleared.
 */
export const LEGACY_LANG_KEY = "jpa-lang";

/**
 * Versioned marker written to AsyncStorage after the one-time Capacitor WebView
 * localStorage → Expo AsyncStorage progress migration runs (or is skipped safely).
 */
export const LEGACY_CAPACITOR_MIGRATION_KEY = "legacyCapacitorMigrationVersion";

/** Current one-time migration version. Bump only if a future migration pass is required. */
export const LEGACY_CAPACITOR_MIGRATION_VERSION = 1;
