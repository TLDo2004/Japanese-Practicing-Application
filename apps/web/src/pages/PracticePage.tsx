import { useNavigate } from "react-router-dom";
import { t } from "@jpa/core";
import { useSession } from "../lib/session";
import { setLabel } from "../lib/sets";
import { useShellMeta } from "../lib/shell-meta";
import { usePlatform } from "../platform/PlatformContext";
import { continueDetail, showPracticeContinue } from "../lib/continue";

/**
 * Script choice is deliberately three options. "One at a time" and
 * "Look-alikes" are different practice shapes, not scripts, so they sit in
 * their own group instead of inflating the script selector.
 */
const SCRIPTS = [
  { mode: "both", glyph: "あア", titleKey: "script_both" },
  { mode: "hira", glyph: "あ", titleKey: "hiragana" },
  { mode: "kata", glyph: "ア", titleKey: "katakana" },
] as const;

const WRITE_SPECIALS = [
  { mode: "random", glyph: "随", titleKey: "special_one_at_a_time", hintKey: "special_one_at_a_time_hint" },
  { mode: "lookalikes", glyph: "似", titleKey: "special_lookalikes", hintKey: "special_lookalikes_hint" },
] as const;

function ScriptList({ kind }: { kind: "write" | "quiz" }) {
  const navigate = useNavigate();
  const hintSuffix = kind === "write" ? "write" : "read";
  return (
    <div className="rows">
      {SCRIPTS.map((item) => {
        const hintKey = item.mode === "both"
          ? `script_both_hint_${hintSuffix}`
          : `script_${item.mode}_hint_${hintSuffix}`;
        return (
          <button
            key={item.mode}
            className="row-item"
            type="button"
            onClick={() => navigate(`/practice/sets/${kind}/${item.mode}`)}
          >
            <span className="row-mark" aria-hidden="true">{item.glyph}</span>
            <span className="row-body">
              <span className="row-title">{t(item.titleKey)}</span>
              <span className="row-hint">{t(hintKey)}</span>
            </span>
            <span className="row-chevron" aria-hidden="true">›</span>
          </button>
        );
      })}
    </div>
  );
}

export function PracticePage() {
  const { continueLast } = useSession();
  const { store } = usePlatform();
  const navigate = useNavigate();
  useShellMeta({ title: t("title_practice"), progress: "" });

  const live = showPracticeContinue(store.lastSession);
  const copy = store.lastSession ? continueDetail(store.lastSession, setLabel) : null;

  return (
    <div>
      {live && copy ? (
        <section className="section">
          <button
            className="continue"
            type="button"
            onClick={() => {
              const kind = continueLast("practice");
              if (kind === "quiz") navigate("/practice/quiz");
              else if (kind === "write") navigate("/practice/write");
            }}
          >
            <span className="continue-body">
              <span className="continue-title">{t("continue_title")}</span>
              <span className="continue-meta">
                {t("continue_detail", { title: copy.title, n: copy.seen, total: copy.total })}
              </span>
            </span>
            <span className="btn btn-primary" aria-hidden="true">{t("continue_resume")}</span>
          </button>
        </section>
      ) : null}

      <h2 className="display" style={{ marginBottom: "var(--s-5)" }}>{t("practice_question")}</h2>

      <section className="section">
        <div className="section-head">
          <h2 className="eyebrow">{t("mode_writing")}</h2>
          <p className="muted">{t("mode_writing_hint")}</p>
        </div>
        <ScriptList kind="write" />
      </section>

      <section className="section">
        <div className="section-head">
          <h2 className="eyebrow">{t("mode_reading")}</h2>
          <p className="muted">{t("mode_reading_hint")}</p>
        </div>
        <ScriptList kind="quiz" />
      </section>

      <section className="section">
        <div className="section-head">
          <h2 className="eyebrow">{t("section_special")}</h2>
        </div>
        <div className="rows">
          {WRITE_SPECIALS.map((item) => (
            <button
              key={item.mode}
              className="row-item"
              type="button"
              onClick={() => navigate(`/practice/sets/write/${item.mode}`)}
            >
              <span className="row-mark" aria-hidden="true">{item.glyph}</span>
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
