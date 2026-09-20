import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

/**
 * Web / PWA Vite config.
 * - Dev: `npm run dev:web` → :5173 (no production service worker)
 * - Build: `npm run build:web` → `apps/web/dist` (static, hash routes, Workbox SW)
 * - Preview: `npm run preview:web` → :4174
 *
 * Service worker cleans only legacy `/^jpa-v\\d+$/` caches and never touches
 * localStorage (`jpa-progress-v1`).
 */
export default defineConfig({
  base: "./",
  plugins: [
    react(),
    VitePWA({
      registerType: "prompt",
      injectRegister: false,
      includeAssets: ["icon.svg", "icon-192.png", "icon-512.png"],
      manifest: {
        name: "Japanese Practicing Application",
        short_name: "Kana Practice",
        description: "Learn, write, and look up words — hiragana and katakana.",
        start_url: "./",
        scope: "./",
        display: "standalone",
        background_color: "#f7f5f0",
        theme_color: "#c44732",
        icons: [
          {
            src: "icon.svg",
            sizes: "any",
            type: "image/svg+xml",
            purpose: "any",
          },
          {
            src: "icon-192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "icon-512.png",
            sizes: "512x512",
            type: "image/png",
          },
        ],
      },
      workbox: {
        // Application shell + bundled glyph templates (JSON inside hashed JS chunks).
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff,woff2,json,webmanifest}"],
        navigateFallback: "index.html",
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        // Shell + self-hosted fonts only; do NOT cache dictionary/translation APIs.
        // Google Fonts CDN removed — UI fonts are bundled via @fontsource.
        runtimeCaching: [],
        importScripts: ["sw-legacy-cleanup.js"],
      },
      // Never install the production SW during Vite HMR / functional e2e on :5173.
      devOptions: {
        enabled: false,
      },
    }),
  ],
  server: {
    port: 5173,
    strictPort: true,
  },
  preview: {
    port: 4174,
    strictPort: true,
  },
});
