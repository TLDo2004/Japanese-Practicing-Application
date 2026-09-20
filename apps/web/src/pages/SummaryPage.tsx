import { Navigate, useNavigate } from "react-router-dom";
import { t } from "@jpa/core";
import { currentPrompt, useSession } from "../lib/session";
import { useShellMeta } from "../lib/shell-meta";

export function SummaryPage() {
  const { session, summary, retrySummary, practiceMissed, clearSession } = useSession();
  const navigate = useNavigate();
  const data = summary();

  useShellMeta({ title: t("summary"), progress: "" });

  if (!session || !data) return <Navigate to="/practice" replace />;

  return (
    <section>
      <div className="summary-head">
        <h2 className="display">{t("summary_title")}</h2>
        <p className="summary-score">
          {data.accuracy}
          <span className="summary-score-unit">%</span>
        </p>
        <p className="summary-line">{data.stats}</p>
      </div>

      <section className="section">
        <div className="section-head">
          <h2 className="eyebrow">{data.missed.length ? t("to_review") : t("nothing_to_review")}</h2>
        </div>
        {data.missed.length ? (
          <div className="review-strip">
            {data.missed.map((item) => {
              const prompt = currentPrompt(session, item);
              const kana = prompt === "kata"
                ? item.kata
                : prompt === "hira"
                  ? item.hira
                  : `${item.hira} ${item.kata}`;
              return (
                <span className="review-item" key={item.key}>
                  <span className="review-glyph">{kana}</span>
                  <span className="review-ro">{item.ro}</span>
                </span>
              );
            })}
          </div>
        ) : (
          <p className="muted">{t("summary_empty")}</p>
        )}
      </section>

      <div className="summary-actions">
        {data.missed.length ? (
          <button
            className="btn btn-primary"
            type="button"
            onClick={() => {
              const next = practiceMissed();
              if (next === "quiz") navigate("/practice/quiz");
              else if (next === "write") navigate("/practice/write");
            }}
          >
            {t("practice_missed")}
          </button>
        ) : null}
        <button
          className="btn btn-secondary"
          type="button"
          onClick={() => {
            const next = retrySummary();
            if (next === "quiz") navigate("/practice/quiz");
            else if (next === "write") navigate("/practice/write");
          }}
        >
          {t("practice_again")}
        </button>
        <button
          className="btn btn-quiet"
          type="button"
          onClick={() => {
            clearSession();
            navigate("/practice");
          }}
        >
          {t("done")}
        </button>
      </div>
    </section>
  );
}
