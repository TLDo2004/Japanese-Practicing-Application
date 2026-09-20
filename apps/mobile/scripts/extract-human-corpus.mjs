/**
 * Extract unique human Drawings from Metro start.log (2026-09-20 human session).
 * Investigation-only — does not change recognition.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const logPath = path.resolve(__dirname, "../.expo/dev/logs/start.log");
const outPath = path.resolve(__dirname, "../src/platform/handwriting/humanDrawings.corpus.json");

const T_MIN = 1789880440000;
const T_MAX = 1789880700000;

function parseCheck(line) {
  const m = line.match(
    /ro=(\w+)\s+alpha=(hira|kata)\s+backend=(\w+)\s+status=(\w+)\s+score=([0-9.null]+)\s+best=(\w+|null)\s+strokes=(\d+)\s+pts=(\d+)(?:\s+ink=(\d+))?.*?matchMs=([0-9.]+).*?totalMs=([0-9.]+)/,
  );
  if (!m) return null;
  return {
    ro: m[1],
    alphabet: m[2],
    backend: m[3],
    status: m[4],
    score: m[5] === "null" ? null : Number(m[5]),
    best: m[6] === "null" ? null : m[6],
    strokes: Number(m[7]),
    pts: Number(m[8]),
    ink: m[9] != null ? Number(m[9]) : null,
    matchMs: Number(m[10]),
    totalMs: Number(m[11]),
    raw: line,
  };
}

function main() {
  const lines = fs.readFileSync(logPath, "utf8").split(/\n/);
  const events = [];
  for (const line of lines) {
    let obj;
    try {
      obj = JSON.parse(line);
    } catch {
      continue;
    }
    if (typeof obj._t !== "number" || obj._t < T_MIN || obj._t > T_MAX) continue;
    if (!Array.isArray(obj.data) || obj.data.length < 2) continue;
    events.push({ t: obj._t, tag: String(obj.data[0]), payload: String(obj.data[1]) });
  }

  const fixtures = [];
  const seen = new Set();

  for (let i = 0; i < events.length; i++) {
    const e = events[i];
    if (e.tag !== "[JPA_HW_CHECK]") continue;
    const check = parseCheck(e.payload);
    if (!check || check.status === "empty") continue;
    // skip software-only adb validation leftovers if any in window — keep skia human
    if (check.backend !== "skia") continue;

    let drawing = null;
    for (let j = i + 1; j < Math.min(i + 8, events.length); j++) {
      if (events[j].tag === "[JPA_HW_DRAWING]") {
        drawing = JSON.parse(events[j].payload);
        break;
      }
    }
    if (!drawing || !Array.isArray(drawing)) continue;

    const key = [
      check.alphabet,
      check.ro,
      check.status,
      check.score,
      check.best,
      check.strokes,
      check.pts,
      check.ink,
    ].join("|");
    if (seen.has(key)) continue; // skip identical rechecks
    seen.add(key);

    const attempt = fixtures.filter((f) => f.alphabet === check.alphabet && f.expectedRo === check.ro).length + 1;
    fixtures.push({
      id: `human-${check.alphabet}-${check.ro}-${attempt}`,
      origin: "human-android-2026-09-20",
      human: true,
      alphabet: check.alphabet,
      expectedRo: check.ro,
      drawing,
      strokeCount: check.strokes,
      pointCount: check.pts,
      baseline: {
        status: check.status,
        expectedScore: check.score,
        best: check.best,
        backend: check.backend,
        ink: check.ink,
        matchMs: check.matchMs,
        totalMs: check.totalMs,
        checkLine: check.raw,
        logT: e.t,
      },
    });
  }

  const corpus = {
    description:
      "Human Drawing regression corpus from CPH2873 HW Validation (2026-09-20). Ground-truth INPUT samples; baseline results are current recognizer behavior, not desired outcomes.",
    device: "CPH2873",
    capturedSession: "2026-09-20T05:00Z approx",
    sourceLog: "apps/mobile/.expo/dev/logs/start.log",
    note: "Multiple attempts per character retained separately. Identical rechecks deduped by score/pts/ink.",
    fixtures,
  };

  fs.writeFileSync(outPath, JSON.stringify(corpus, null, 2) + "\n");
  console.log("wrote", outPath);
  console.log("count", fixtures.length);
  const by = new Map();
  for (const f of fixtures) {
    const k = `${f.alphabet}:${f.expectedRo}`;
    by.set(k, (by.get(k) || 0) + 1);
  }
  console.log([...by.entries()].sort().map(([k, n]) => `${k}=${n}`).join("\n"));
}

main();
