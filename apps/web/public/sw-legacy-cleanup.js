/**
 * Runs inside the React production service worker (via Workbox importScripts).
 * Deletes ONLY known legacy app caches named jpa-v{N}.
 * Never touches localStorage / IndexedDB / cookies.
 */
/* eslint-disable no-restricted-globals */
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => /^jpa-v\d+$/.test(key))
          .map((key) => caches.delete(key)),
      ),
    ),
  );
});
