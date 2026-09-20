/**
 * Register the production service worker only for browser http(s) contexts.
 */
export function shouldRegisterBrowserPwa(input?: {
  isProd?: boolean;
  protocol?: string;
  hasServiceWorker?: boolean;
}): boolean {
  const isProd = input?.isProd ?? (typeof import.meta !== "undefined" && !!import.meta.env?.PROD);
  if (!isProd) return false;

  const protocol = input?.protocol
    ?? (typeof window !== "undefined" ? window.location.protocol : "");
  if (protocol !== "http:" && protocol !== "https:") return false;

  const hasSw = input?.hasServiceWorker
    ?? (typeof navigator !== "undefined" && "serviceWorker" in navigator);
  return hasSw;
}
