# Cutover status

Capacitor → Expo cutover is **complete**. Expo (`apps/mobile`) is the only
Android product. Application ID: `com.japanese.practicing`.

## Removed (do not restore)

- Root Capacitor `android/`, `capacitor.config.json`, Capacitor npm deps
- Legacy vanilla `web/`
- Electron / desktop

## Kept on purpose

- One-time **data** migration bridge (WebView localStorage → AsyncStorage)
  for users upgrading from the old Capacitor install. See
  `docs/production-mobile-migration.md`.
- Frozen handwriting fixtures / golden tests.

## External release blockers (Step 2)

1. Production signing credentials matching the live Play upload key
2. Actual Play Console `versionCode` (set Expo higher than live)
3. Signed in-place upgrade verification on a device
