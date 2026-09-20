import { useState, type FormEvent } from "react";
import type { DictMode } from "@jpa/dictionary";
import { rubyFor } from "@jpa/dictionary";
import { migrateDictMode, nextRecentSearches, t } from "@jpa/core";
import { RubyText } from "../components/RubyText";
import { useShellMeta } from "../lib/shell-meta";
import { usePlatform } from "../platform/PlatformContext";
import type { DictionaryView } from "../platform/dictionary/webDictionary";

const MODES: Array<{ id: DictMode; key: string }> = [
  { id: "dict-jp-en", key: "mode_dict_jp_en" },
  { id: "dict-jp-vi", key: "mode_dict_jp_vi" },
  { id: "tr-en-jp", key: "mode_tr_en_jp" },
  { id: "tr-jp-en", key: "mode_tr_jp_en" },
  { id: "tr-vi-jp", key: "mode_tr_vi_jp" },
  { id: "tr-jp-vi", key: "mode_tr_jp_vi" },
];

export function DictionaryPage() {
  const { store, save, dictionary, speech } = usePlatform();
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState<DictMode>(() => migrateDictMode(store.dictMode) as DictMode);
  const [status, setStatus] = useState("");
  const [view, setView] = useState<DictionaryView | null>(null);
  const [loading, setLoading] = useState(false);
  useShellMeta({ title: t("title_dictionary"), progress: "" });

  const readJapanese = (text: string) => {
    if (!text) return;
    try {
      speech.speak(text);
    } catch {
      /* speech failure is nonfatal */
    }
  };

  const runSearch = async (raw: string, nextMode: DictMode) => {
    const q = raw.trim();
    if (!q) {
      setStatus(t("dict_empty"));
      return;
    }
    save({
      dictMode: nextMode,
      dictRecent: nextRecentSearches(store.dictRecent, q),
    });
    setLoading(true);
    setView(null);
    setStatus(t("searching"));
    try {
      const result = await dictionary.search(q, nextMode);
      setView(result);
      if (result.kind === "error") {
        setStatus(t("search_failed"));
      } else if (result.kind === "none") {
        setStatus(result.note || t("no_matches"));
      } else if (result.kind === "translation") {
        setStatus(result.note || "");
      } else {
        setStatus(result.note || (result.entries.length === 1
          ? t("results_one")
          : t("results_many", { n: result.entries.length })));
      }
    } catch {
      setView({ kind: "error", keyword: q, note: "search_failed" });
      setStatus(t("search_failed"));
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    void runSearch(query, mode);
  };

  const onMode = (next: DictMode) => {
    setMode(next);
    save({ dictMode: next });
  };

  const recent = store.dictRecent;
  const showRecent = !view && !loading && recent.length > 0;

  return (
    <section>
      <form className="search-form" onSubmit={onSubmit} role="search">
        <input
          type="search"
          enterKeyHint="search"
          autoComplete="off"
          placeholder={t("dict_placeholder")}
          aria-label={t("dict_placeholder")}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <button className="btn btn-primary" type="submit" disabled={loading}>{t("search")}</button>
      </form>

      <label className="visually-hidden" htmlFor="dict-mode">{t("dict_mode_label")}</label>
      <select
        id="dict-mode"
        className="mode-select"
        value={mode}
        aria-label={t("dict_mode_label")}
        onChange={(event) => onMode(event.target.value as DictMode)}
      >
        {MODES.map((item) => (
          <option key={item.id} value={item.id}>{t(item.key)}</option>
        ))}
      </select>

      <p className="search-status" role="status" aria-live="polite">{status}</p>

      {showRecent ? (
        <section className="section">
          <h2 className="eyebrow">{t("recent_searches")}</h2>
          <div className="chip-row">
            {recent.map((item) => (
              <button
                key={item}
                type="button"
                className="chip"
                onClick={() => {
                  setQuery(item);
                  void runSearch(item, mode);
                }}
              >
                {item}
              </button>
            ))}
          </div>
        </section>
      ) : null}

      {!view && !loading && !recent.length ? (
        <p className="muted">{t("dict_hint")}</p>
      ) : null}

      {view?.kind === "translation" ? (
        <article className="entry">
          <p className="entry-jp">{view.source}</p>
          {view.japaneseReading && view.japaneseText === view.output ? (
            <p className="entry-reading">{view.japaneseReading}</p>
          ) : null}
          <p className="entry-sense">
            <span className="entry-pos">{t("dict_translated")}</span>
            <span className="entry-gloss">{view.output}</span>
          </p>
          {view.japaneseReading && view.japaneseText === view.source ? (
            <p className="entry-reading">{view.japaneseReading}</p>
          ) : null}
          {view.romaji ? (
            <p className="entry-ro" data-testid="dict-romaji">
              <span className="entry-ro-label">{t("dict_romaji")}</span> {view.romaji}
            </p>
          ) : null}
          {view.speakText ? (
            <div className="entry-actions">
              <button
                type="button"
                className="btn btn-secondary"
                data-testid="dict-read"
                onClick={() => readJapanese(view.speakText)}
              >
                {t("dict_read")}
              </button>
            </div>
          ) : null}
        </article>
      ) : null}

      {view?.kind === "none" ? (
        <article className="entry">
          <p className="entry-jp">
            <RubyText nodes={rubyFor(view.keyword, /[\u3040-\u30ff]/.test(view.keyword) ? view.keyword : "")} />
          </p>
          <p className="entry-gloss">{view.note || t("dict_none")}</p>
        </article>
      ) : null}

      {view?.kind === "error" ? (
        <article className="entry">
          <p className="entry-gloss">{t("search_failed")}</p>
          <p className="muted">{t("dict_offline_hint")}</p>
        </article>
      ) : null}

      {view?.kind === "entries" ? (
        <div>
          {view.entries.map((entry, index) => (
            <article className="entry" key={`${entry.word}-${index}`}>
              <p className="entry-jp"><RubyText nodes={entry.ruby} /></p>
              {entry.reading ? <p className="entry-reading">{entry.reading}</p> : null}
              {entry.senses.map((sense, senseIndex) => (
                <p className="entry-sense" key={senseIndex}>
                  <span className="entry-pos">{sense.pos}</span>
                  <span className="entry-gloss">{sense.gloss}</span>
                </p>
              ))}
              {entry.romaji ? (
                <p className="entry-ro" data-testid="dict-romaji">
                  <span className="entry-ro-label">{t("dict_romaji")}</span> {entry.romaji}
                </p>
              ) : null}
              {entry.speakText ? (
                <div className="entry-actions">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    data-testid="dict-read"
                    onClick={() => readJapanese(entry.speakText)}
                  >
                    {t("dict_read")}
                  </button>
                </div>
              ) : null}
            </article>
          ))}
        </div>
      ) : null}
    </section>
  );
}
