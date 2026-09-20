import { NavLink } from "react-router-dom";
import { t } from "@jpa/core";

export type TabId = "learn" | "practice" | "dict";

/**
 * Kana/kanji marks rather than generic icons — the Japanese characters carry
 * the product's visual identity, and they read at small sizes.
 */
const ITEMS: Array<{ id: TabId; to: string; mark: string; labelKey: string }> = [
  { id: "learn", to: "/learn", mark: "学", labelKey: "nav_learn" },
  { id: "practice", to: "/practice", mark: "書", labelKey: "nav_practice" },
  { id: "dict", to: "/dictionary", mark: "辞", labelKey: "nav_dictionary" },
];

export function SideRail({ tab }: { tab: TabId }) {
  return (
    <div className="rail">
      <div className="rail-brand">
        <span className="rail-brand-mark" aria-hidden="true">あ</span>
        <span className="rail-brand-name">{t("app_name")}</span>
      </div>
      <nav className="rail-nav" aria-label={t("app_name")}>
        {ITEMS.map((item) => (
          <NavLink
            key={item.id}
            to={item.to}
            className={`rail-item${tab === item.id ? " is-active" : ""}`}
            aria-current={tab === item.id ? "page" : undefined}
          >
            <span className="tab-mark" aria-hidden="true">{item.mark}</span>
            <span>{t(item.labelKey)}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}

export function BottomNav({ tab }: { tab: TabId }) {
  return (
    <nav className="tabbar" aria-label={t("app_name")}>
      {ITEMS.map((item) => (
        <NavLink
          key={item.id}
          to={item.to}
          className={`tabbar-item${tab === item.id ? " is-active" : ""}`}
          aria-current={tab === item.id ? "page" : undefined}
        >
          <span className="tab-mark" aria-hidden="true">{item.mark}</span>
          <span>{t(item.labelKey)}</span>
        </NavLink>
      ))}
    </nav>
  );
}
