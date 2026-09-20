import { t } from "@jpa/core";
import type { SetOption } from "../lib/sets";

const GROUPS = [
  { id: "rows", titleKey: "group_rows" },
  { id: "special", titleKey: "group_special" },
  { id: "complete", titleKey: "group_complete" },
] as const;

export function SetPicker({
  options,
  onPick,
}: {
  options: SetOption[];
  onPick: (id: string) => void;
}) {
  return (
    <div>
      {GROUPS.map((group) => {
        const items = options.filter((opt) => opt.group === group.id);
        if (!items.length) return null;
        return (
          <section className="section" key={group.id}>
            <h2 className="eyebrow">{t(group.titleKey)}</h2>
            <div className="rows">
              {items.map((opt) => (
                <button
                  key={opt.id}
                  className="row-item"
                  type="button"
                  onClick={() => onPick(opt.id)}
                >
                  <span className="row-body">
                    <span className="row-title">{opt.label}</span>
                    <span className="row-hint">{opt.hint}</span>
                  </span>
                  <span className="row-chevron" aria-hidden="true">›</span>
                </button>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
