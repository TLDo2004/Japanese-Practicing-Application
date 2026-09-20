import { useEffect } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { t } from "@jpa/core";
import { BottomNav, SideRail } from "./Nav";
import { BackIcon } from "./Icons";
import { activeTab, isSecondaryRoute, isWideRoute, parsePath, persistableTab } from "../lib/routes";
import { useSession } from "../lib/session";
import { useShellMetaState } from "../lib/shell-meta";
import { usePlatform } from "../platform/PlatformContext";

export function AppShell() {
  const { session } = useSession();
  const { save } = usePlatform();
  const location = useLocation();
  const navigate = useNavigate();
  const route = parsePath(location.pathname);
  const tab = activeTab(route);
  const secondary = isSecondaryRoute(route);
  const wide = isWideRoute(route);
  const pageMeta = useShellMetaState();

  useEffect(() => {
    save({ lastTab: persistableTab(route, session?.origin) });
  }, [route.name, session?.origin, save]);

  const defaultTitle = (() => {
    if (route.name === "practice") return t("title_practice");
    if (route.name === "dict") return t("title_dictionary");
    if (route.name === "summary") return t("summary");
    return t("title_learn");
  })();

  const title = pageMeta?.title || defaultTitle;
  const counter = pageMeta?.progress || "";

  const goBack = () => {
    if (route.name === "character") {
      navigate(`/learn/chart/${route.script}`);
      return;
    }
    if (session?.learnDrill && route.name === "writing") {
      navigate(`/learn/chart/${session.learnScript}`);
      return;
    }
    if (route.name === "chart") {
      navigate("/learn");
      return;
    }
    if (session?.origin === "learn" && (route.name === "writing" || route.name === "summary")) {
      navigate("/learn");
      return;
    }
    navigate("/practice");
  };

  return (
    <div className={`app${secondary ? " is-secondary" : ""}`}>
      <SideRail tab={tab} />
      <div className="app-col">
        <header className={`topbar${secondary ? " is-secondary" : ""}`}>
          <div className={`topbar-inner${wide ? " is-wide" : ""}`}>
            {secondary ? (
              <button className="btn-back" type="button" onClick={goBack}>
                <BackIcon />
                <span>{t("back")}</span>
              </button>
            ) : null}
            <h1>{title}</h1>
            {counter ? <p className="counter">{counter}</p> : null}
          </div>
        </header>
        <main className={`app-main${wide ? " is-wide" : ""}${route.name === "dict" ? " is-reading" : ""}`}>
          <Outlet />
        </main>
      </div>
      {secondary ? null : <BottomNav tab={tab} />}
    </div>
  );
}
