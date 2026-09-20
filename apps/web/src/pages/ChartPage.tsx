import { useMemo } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { ALL, type Letter } from "@jpa/kana";
import { t } from "@jpa/core";
import { ChartGrid } from "../components/ChartGrid";
import { chartSectionsFor, visibleLetterCount } from "../lib/chart";
import { useShellMeta } from "../lib/shell-meta";
import { usePlatform } from "../platform/PlatformContext";

const FILTERS = [
  { id: "basic", key: "filter_basic" },
  { id: "dakuten", key: "filter_dakuten" },
  { id: "yoon", key: "filter_yoon" },
  { id: "all", key: "filter_all" },
] as const;

export function ChartPage() {
  const { script: scriptParam } = useParams();
  const script = scriptParam === "kata" ? "kata" : scriptParam === "hira" ? "hira" : null;
  const { store, save } = usePlatform();
  const navigate = useNavigate();
  const filter = store.chartFilter || "basic";

  const sections = useMemo(() => chartSectionsFor(ALL, filter), [filter]);
  const count = visibleLetterCount(sections);
  useShellMeta({
    title: script === "kata" ? t("title_kata_chart") : t("title_hira_chart"),
    progress: t("chart_count", { n: count }),
  });

  const learnedRos = useMemo(() => {
    const prefix = `${script}:`;
    return new Set(
      Object.keys(store.learned)
        .filter((key) => store.learned[key] && key.startsWith(prefix))
        .map((key) => key.slice(prefix.length)),
    );
  }, [store.learned, script]);

  if (!script) return <Navigate to="/learn" replace />;

  const onPick = (letter: Letter) => {
    navigate(`/learn/chart/${script}/${letter.ro}`);
  };

  return (
    <div>
      <p className="note">{t("chart_note")}</p>
      <div className="segmented" role="tablist" aria-label={t("filter_label")}>
        {FILTERS.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={filter === item.id}
            className={`segment${filter === item.id ? " is-active" : ""}`}
            onClick={() => save({ chartFilter: item.id })}
          >
            {t(item.key)}
          </button>
        ))}
      </div>
      <hr className="rule" />
      <ChartGrid
        sections={sections}
        script={script}
        clickable
        learnedRos={learnedRos}
        onPick={onPick}
      />
    </div>
  );
}
