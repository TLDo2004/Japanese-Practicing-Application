# Handwriting oracle artifacts

Frozen regression evidence for `@jpa/handwriting`.

## Do not silently regenerate

`templates/fixtures.json` and `templates/glyphs.json` are **frozen** golden
oracle artifacts. Unit tests (`matchInk.golden.test.ts` and related) load
these JSON files and do **not** require a browser, Canvas, DOM, or any
legacy `web/` import.

Do **not** regenerate these files merely to “refresh” expectations or to
match a newer recognizer implementation. Silent regeneration would change
(or risk changing) golden semantics and hide regressions.

Re-capture is an explicit, separately approved task with a documented
reason — not part of normal development or cutover cleanup.

## How expectations were originally captured

Historically generated once via Playwright/Chromium against the legacy
vanilla recognizer (`fillText` Noto Sans JP templates + `matchPad`
verdicts). That generator and the legacy `web/` tree have been removed;
only these frozen JSON artifacts remain as evidence.

## Font / raster settings (historical capture)

- Family: Noto Sans JP
- Weight: 700
- Template canvas: 256×256
- Font size: 180 (110 for yōon)
- Align/baseline: center / middle
- Y offset: +8 (combo +4)
- User strokes: width 5, round cap/join, color `#1a1612`, DPR 1
- Ink alpha threshold: 24
- Mask: 56×56
