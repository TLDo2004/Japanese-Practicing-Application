import { useEffect, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { BY_RO } from "@jpa/kana";
import { isLearned, t } from "@jpa/core";
import { SpeakIcon } from "../components/Icons";
import { useSession } from "../lib/session";
import { useShellMeta } from "../lib/shell-meta";
import { usePlatform } from "../platform/PlatformContext";

/**
 * Only shows what the app actually knows about a character: the two scripts,
 * the romaji, audio, and whether it has been learned. There is no vocabulary
 * data in the product, so no examples are shown.
 */
export function CharacterPage() {
  const { script: scriptParam, ro } = useParams();
  const script = scriptParam === "kata" ? "kata" : "hira";
  const letter = ro ? BY_RO[ro] : undefined;
  const { beginLearnDrill } = useSession();
  const { store, speech } = usePlatform();
  const navigate = useNavigate();
  const [speechHint, setSpeechHint] = useState("");

  const glyph = letter ? (script === "kata" ? letter.kata : letter.hira) : "";
  const otherGlyph = letter ? (script === "kata" ? letter.hira : letter.kata) : "";

  useShellMeta({ title: glyph || t("title_learn"), progress: "" });

  useEffect(() => {
    speech.setHintHandler((key) => setSpeechHint(t(key)));
  }, [speech]);

  if (!letter) return <Navigate to={`/learn/chart/${script}`} replace />;

  const learned = isLearned(store.learned, script, letter.ro);

  return (
    <div>
      <section className="detail-hero">
        <p className="detail-glyph">{glyph}</p>
        <p className="detail-ro">{letter.ro}</p>
        <p className={`detail-state${learned ? " is-learned" : ""}`}>
          <span className="dot" aria-hidden="true" />
          {learned ? t("learned") : t("not_learned")}
        </p>
      </section>

      <div className="btn-row center" style={{ marginTop: "var(--s-4)" }}>
        <button
          className="btn btn-secondary"
          type="button"
          onClick={() => {
            try {
              speech.speakCurrent(letter);
            } catch {
              /* speech must never break the page */
            }
          }}
        >
          <SpeakIcon />
          {t("detail_listen")}
        </button>
      </div>
      <p className="feedback" role="status" aria-live="polite">{speechHint}</p>

      <section className="section" style={{ marginTop: "var(--s-5)" }}>
        <div className="section-head">
          <h2 className="eyebrow">{t("detail_also_written")}</h2>
        </div>
        <div className="detail-pair">
          <div className="detail-pair-item">
            <p className="detail-pair-glyph">{letter.hira}</p>
            <p className="muted">{t("hiragana")}</p>
          </div>
          <div className="detail-pair-item">
            <p className="detail-pair-glyph">{letter.kata}</p>
            <p className="muted">{t("katakana")}</p>
          </div>
        </div>
        <p className="visually-hidden">{otherGlyph}</p>
      </section>

      <div className="commit-row">
        <button
          className="btn btn-primary"
          type="button"
          onClick={() => {
            beginLearnDrill(script, letter);
            navigate("/practice/write");
          }}
        >
          {t("detail_practice")}
        </button>
      </div>
    </div>
  );
}
