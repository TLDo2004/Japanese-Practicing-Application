# Technical debt

Do not silently “fix” legacy behavior while changing presentation. Record
suspected bugs or dead paths here and change them in a separate, explicit
task.

## Preserve even if it looks odd

- Learn drill does not persist session progress.
- Learn Continue vs Practice Continue use different visibility rules.
- `weak` progress is written and never shown as a practice set in the UI.
- Speech always reads `current.hira`, including katakana prompts (practice path).
- Quiz romaji aliases (`dji`/`dzu`, `wo`/`o`, Hepburn vs kunrei, …).
- Lookalikes picker variants still store `setId: "lookalikes"`.
- `chartHidden` exists but stays false.
- Must-check-before-next at the session frontier.

## Classification (FINAL STEP 1 triage)

| Item | Class |
|---|---|
| weak not exposed as practice set | ACCEPTED BEHAVIOR / POST-RELEASE |
| speech uses hira in practice | ACCEPTED BEHAVIOR (dictionary Read is a separate SpeechPort path) |
| lookalikes `setId` | ACCEPTED BEHAVIOR |
| Learn vs Practice Continue rules | ACCEPTED BEHAVIOR |
| React 18 Web / React 19 Mobile | ACCEPTED BEHAVIOR |
| `#/__match-bench`, `/practice/hw-validation` | Development-only (gated: `import.meta.env.DEV` / `__DEV__`); not in product nav |
| Capacitor / Electron / Vietnamese UI Lang | OBSOLETE (removed) |
| Handwriting recognizer (シ/ツ/ソ/ン peers) | **PASS FOR RELEASE** — see Handwriting section |

## Handwriting

**FINAL STEP 1 Part C — classification: PASS FOR RELEASE**

The shared recognizer must stay raster `BinaryInk` plus `Drawing` for
katakana geometry. Do not simplify to stroke-only matching. Golden
fixtures (シ/ツ, ソ/ン, peers, empty, borderline, invalid) are a hard
gate and are **frozen** — do not silently regenerate
`packages/handwriting/templates/*.json`.

| Proposal | Status |
|---|---|
| 1 (`accepted_conditional_low_recall`) | **ADOPTED** |
| 2 (シ slant / shortSlant) | **REJECTED** (geometry-only; no recognition win) |
| 4 (peer discrimination シ/ツ/ソ/ン) | **NOT IMPLEMENTED** — unnecessary for release |
| 3 (thin-stroke / distance-transform templates) | **NOT IMPLEMENTED** — unnecessary for release |

### Release gate (シ/ツ/ソ/ン)

Peer confusion is **not** a release blocker. Human corpus + Proposal 1
regression show **no off-diagonal false accepts** in the シ/ツ/ソ/ン
matrix; failures are predominantly false negatives (`rejected_not_argmax`
/ `rejected_peer` / recall). Those are retryable (`bad` → no progress
credit) and do not corrupt learned/progress state. Oracle/golden,
Drawing fixtures, human corpus baselines, Android captured fixtures,
and Proposal 1 acceptance tests are green.

### Known limitations (document; do not “fix” silently)

- Thin human pad strokes vs fat font-glyph IoU templates → low recall
  for many real シ/ツ/ソ samples (and some ン peers); users may need
  retries or clearer strokes.
- ン-2 / ン-3 remain rejected (peerGap and/or conditional precision).
- Third natural ソ capture still missing from the human corpus.
- Noto `ソ` glyph can accept as `so` while shown rival is `zo`
  (closeMargin) — preserve.
- Synthetic pad strokes for シ/ツ/ソ/ン did not pass legacy IoU against
  font templates; oracle “correct” kata samples use fillText rasters.

## Discovered during handwriting decoupling

- A Noto `ソ` glyph raster can be **accepted** as `so` while `best.ro`
  is `zo` (closeMargin). Preserve; do not “fix” shown rival.
- Synthetic pad strokes for シ/ツ/ソ/ン did **not** pass legacy IoU
  against font templates. Oracle “correct” kata samples use the same
  `fillText` raster as template generation (empty Drawing; geometry
  falls back to `maskSlant`).
- `isCombo` uses `letter.hira.length > 1` even when matching katakana.
- `matchPad` / `matchInk` compare user ink to **every** template in the
  active set; do not rebuild templates per Check.

## Hidden investigation surfaces (not product navigation)

- `apps/web` `#/__match-bench` — matchInk bench
- `apps/mobile` `/practice/hw-validation` — Android native validation harness

These are not in Learn / Practice / Dictionary navigation. They expose
recognizer diagnostics and must stay off the production path.

## Speech on mobile

Use `SpeechPort`. Choose the currently supported Expo/native audio
mechanism for fallback playback at implementation time. Do not treat
`expo-av` as an architectural requirement.

## Discovered during Phase 2 extraction

- `lettersFor` returns `.slice()` copies of arrays; letter objects are
  shared references, not deep clones.
- `lettersFor` only maps BASIC and VOICED row ids. Yōon row ids such as
  `yoon-k` fall through to `FULL71`, same as unknown set ids.
- `pickRandom` uses `Math.floor(random() * pool.length)` with no clamp;
  a `Math.random()` of exactly `1` would be out of range.
- `migrate()` treats any non-null object (including arrays) as a store
  object. `typeof learned === "object"` also accepts arrays.
- `dictMode` and `chartFilter` accept any string; they are not enumerated
  on the store type (mapping happens in `migrateDictMode`).
- `lastTab` only allows `learn` | `practice` | `dict`. The value
  `dictionary` is remapped to `learn`.
- `wo` alias `"o"` also matches via reverse alias lookup (`romajiMatches("wo", "o")`).
- `dji` aliases include `"ji"`, which is also the canonical romaji for `じ`.
- Practice-missed rebuilds a subset of letters but keeps the original
  `setId` (including `"lookalikes"`).
- `pickShown` takes `expectedRo` but does not use it.
- Shared ruby helpers return structured nodes, not HTML strings. Web
  rendering must escape text when turning nodes into markup.

## Removed (do not resurrect)

- Electron / Desktop product, IPC, `window.api`, Electron dictionary fallback
- Vietnamese UI language, `Lang`, language selector, UI catalogs
- Capacitor root project, `capacitor.config.json`, `cap:*` scripts
- Legacy vanilla `web/` product tree
- Oracle generator that imported `web/js/services/handwriting.js`
- `apps/mobile-scaffold`

Vietnamese **dictionary/translation content modes** (`dict-jp-vi`, `tr-vi-jp`,
`tr-jp-vi`) are intentional product features — not UI localization.
