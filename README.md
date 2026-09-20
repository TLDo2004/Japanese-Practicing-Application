# Japanese Practicing Application

Hiragana and katakana practice for web and Android.

## Products

| Surface | Path | Notes |
|---|---|---|
| Web / PWA | `apps/web` | Vite + React; hash routing; offline shell |
| Android | `apps/mobile` | Expo + React Native; package `com.japanese.practicing` |

Shared domain packages: `core`, `kana`, `practice`, `handwriting`, `dictionary`.

UI language is **English only**. Vietnamese appears only as dictionary/translation **content**.

## Commands

```
npm run dev:web          # Vite dev server
npm run build:web        # Production static build → apps/web/dist
npm run preview:web      # Preview production build locally
npm run test             # Unit tests
npm run test:e2e         # Playwright (Vite)
npm run test:e2e:pwa     # Playwright against production PWA build
npm run mobile           # Expo start
npm run mobile:android   # Expo Android (dev)
```

Android release-like APK (from `apps/mobile/android`):

```
gradlew.bat :app:assembleRelease
# or assembleDebug for a standalone debug APK (no Metro)
```

Output: `apps/mobile/android/app/build/outputs/apk/...`

## Web deployment

`npm run build:web` produces a self-contained static site in `apps/web/dist`
suitable for HTTPS hosts (Vercel, Cloudflare Pages, etc.). Hash routes need
no server rewrite. Do not deploy with a localhost API base.

## Docs

- `docs/production-mobile-migration.md` — Capacitor→Expo data migration + release blockers
- `docs/cutover.md` — cutover status
- `docs/technical-debt.md` — accepted debt and handwriting classification

Handwriting fixtures under `packages/handwriting/templates/` are **frozen**
regression evidence — do not silently regenerate them.

## Credits

Designed by Thanhliem Do.
