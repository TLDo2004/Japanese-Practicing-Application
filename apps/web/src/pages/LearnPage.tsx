import { useNavigate } from "react-router-dom";
import { t } from "@jpa/core";
import { useSession } from "../lib/session";
import { setLabel } from "../lib/sets";
import { useShellMeta } from "../lib/shell-meta";
import { usePlatform } from "../platform/PlatformContext";
import { continueDetail, learnContinueState, scriptProgress } from "../lib/continue";

const SCRIPTS = [
  { id: "hira", glyph: "あ", nameKey: "hiragana", tone: "hira" },
  { id: "kata", glyph: "ア", nameKey: "katakana", tone: "kata" },
] as const;

/** Explore = chart filters (Basic / Dakuten / Yōon / All), not practice shortcuts. */
const EXPLORE = [
  { filter: "basic", mark: "あ", titleKey: "explore_basic", hintKey: "explore_basic_hint", tone: "green" },
  { filter: "dakuten", mark: "が", titleKey: "explore_dakuten", hintKey: "explore_dakuten_hint", tone: "blue" },
  { filter: "yoon", mark: "きゃ", titleKey: "explore_yoon", hintKey: "explore_yoon_hint", tone: "violet" },
  { filter: "all", mark: "全", titleKey: "explore_all", hintKey: "explore_all_hint", tone: "yellow" },
] as const;

export function LearnPage() {
  const { continueLast } = useSession();
  const { store, save } = usePlatform();
  const navigate = useNavigate();
  useShellMeta({ title: t("title_learn"), progress: "" });

  const live = learnContinueState(store.lastSession) === "live";
  const copy = store.lastSession ? continueDetail(store.lastSession, setLabel) : null;

  const onContinue = () => {
    if (!live) {
      navigate("/learn/chart/hira");
      return;
    }
    const kind = continueLast("learn");
    if (kind === "quiz") navigate("/practice/quiz");
    else if (kind === "write") navigate("/practice/write");
    else navigate("/learn/chart/hira");
  };

  const openExplore = (filter: string) => {
    save({ chartFilter: filter });
    navigate("/learn/chart/hira");
  };

  return (
    <div>
      <section className="section">
        <button className="continue" type="button" onClick={onContinue}>
          <span className="continue-body">
            <span className="continue-title">
              {live ? t("continue_title") : t("start_title")}
            </span>
            <span className="continue-meta">
              {live && copy
                ? t("continue_detail", { title: copy.title, n: copy.seen, total: copy.total })
                : t("start_hint")}
            </span>
          </span>
          <span className="btn btn-primary" aria-hidden="true">
            {live ? t("continue_resume") : t("start_action")}
          </span>
        </button>
      </section>

      <section className="section">
        <div className="section-head">
          <h2 className="eyebrow">{t("section_scripts")}</h2>
        </div>
        {SCRIPTS.map((script) => {
          const progress = scriptProgress(script.id, store.learned);
          return (
            <button
              key={script.id}
              className={`script-row is-${script.tone}`}
              type="button"
              onClick={() => navigate(`/learn/chart/${script.id}`)}
            >
              <span className="script-glyph" aria-hidden="true">{script.glyph}</span>
              <span className="script-body">
                <span className="script-name">{t(script.nameKey)}</span>
                <span className="meter">
                  <span className="meter-fill" style={{ width: `${progress.pct}%` }} />
                </span>
                <span className="script-count">
                  {t("learned_of", { n: progress.n, total: progress.total })}
                </span>
              </span>
              <span className="row-chevron" aria-hidden="true">›</span>
            </button>
          );
        })}
      </section>

      <section className="section">
        <div className="section-head">
          <h2 className="eyebrow">{t("section_explore")}</h2>
        </div>
        <div className="rows">
          {EXPLORE.map((item) => (
            <button
              key={item.filter}
              className={`row-item is-${item.tone}`}
              type="button"
              onClick={() => openExplore(item.filter)}
            >
              <span className="row-mark" aria-hidden="true">{item.mark}</span>
              <span className="row-body">
                <span className="row-title">{t(item.titleKey)}</span>
                <span className="row-hint">{t(item.hintKey)}</span>
              </span>
              <span className="row-chevron" aria-hidden="true">›</span>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
