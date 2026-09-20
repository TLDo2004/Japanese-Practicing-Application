# Production mobile migration (Capacitor → Expo)

**Status:** Complete. Expo is the sole Android product under
`com.japanese.practicing`.

## Why the migration bridge still exists

Existing Capacitor installs store progress in WebView `localStorage`
(`jpa-progress-v1`, origin typically `https://localhost`). Expo uses
AsyncStorage. Same application ID does **not** convert storage automatically.

Bridge files (keep until migration support is retired):

- `apps/mobile/src/platform/legacyCapacitorMigration.ts`
- `apps/mobile/src/platform/legacyWebViewStorage.ts`
- `LegacyWebViewStorageModule.kt` / `LegacyWebViewStoragePackage.kt`
- marker key `legacyCapacitorMigrationVersion`

### Precedence

1. Marker ≥ 1 → no destructive rerun  
2. Valid AsyncStorage progress → keep Expo  
3. Empty AsyncStorage + valid legacy → migrate via `migrate()`  
4. Malformed / missing legacy → empty store + set marker (no crash)

`jpa-lang` is ignored (UI is English-only). JP↔VI `dictMode` values are kept.

## Identity

| Field | Value |
|---|---|
| Application ID | `com.japanese.practicing` |
| Former dev ID | `com.japanese.practicing.expo` (retired) |

## External release blockers

| Item | Status |
|---|---|
| Production signing / upload keystore | **Unavailable** — do not invent |
| Live Play Console `versionCode` | **Unknown** — Expo local `versionCode` is `1`; must be **greater than** live |
| Signed in-place upgrade proof | **Blocked** until signing matches the Capacitor install |

## Related

See `docs/cutover.md` and `docs/technical-debt.md`.
