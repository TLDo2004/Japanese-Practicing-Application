import { useCallback, useEffect, useState } from "react";
import { t } from "@jpa/core";
import { shouldRegisterBrowserPwa } from "../platform/pwa/runtime";

type RegisterSW = (options?: {
  immediate?: boolean;
  onNeedRefresh?: () => void;
  onOfflineReady?: () => void;
  onRegisteredSW?: (swScriptUrl: string, registration: ServiceWorkerRegistration | undefined) => void;
}) => (reloadPage?: boolean) => Promise<void>;

/** Browser production PWA only — skipped during Vite dev. */
export function PwaUpdateBanner() {
  const [needRefresh, setNeedRefresh] = useState(false);
  const [updateSW, setUpdateSW] = useState<((reload?: boolean) => Promise<void>) | null>(null);

  useEffect(() => {
    if (!shouldRegisterBrowserPwa()) return;
    let cancelled = false;
    void import("virtual:pwa-register").then((mod) => {
      if (cancelled) return;
      const registerSW = mod.registerSW as RegisterSW;
      const update = registerSW({
        immediate: true,
        onNeedRefresh() {
          setNeedRefresh(true);
        },
      });
      setUpdateSW(() => update);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const onRefresh = useCallback(() => {
    void updateSW?.(true);
  }, [updateSW]);

  if (!needRefresh) return null;

  return (
    <div className="pwa-update" role="status">
      <span>{t("pwa_update")}</span>
      <button type="button" className="btn btn-primary" onClick={onRefresh}>
        {t("pwa_reload")}
      </button>
    </div>
  );
}
