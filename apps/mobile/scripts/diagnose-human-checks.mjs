import fs from "fs";
import {
  loadGlyphTemplates,
  matchInk,
  rasterizeDrawingRgba,
  extractInkFromRgba,
  LOGICAL_PAD,
} from "@jpa/handwriting";
import packed from "@jpa/handwriting/templates/glyphs.json" with { type: "json" };

const logPath = "E:/Japanese Practicing Application/apps/mobile/.expo/dev/logs/start.log";
const lines = fs.readFileSync(logPath, "utf8").split(/\n/);
const templates = loadGlyphTemplates(packed);

function eventsInRange(tMin, tMax) {
  const out = [];
  for (const line of lines) {
    let obj;
    try { obj = JSON.parse(line); } catch { continue; }
    if (typeof obj._t !== "number" || obj._t < tMin || obj._t > tMax) continue;
    if (!Array.isArray(obj.data)) continue;
    out.push({ t: obj._t, tag: obj.data[0], payload: obj.data[1] });
  }
  return out;
}

function drawingAfterCheck(events, checkPred) {
  for (let i = 0; i < events.length; i++) {
    const e = events[i];
    if (e.tag !== "[JPA_HW_CHECK]") continue;
    if (!checkPred(String(e.payload))) continue;
    for (let j = i + 1; j < Math.min(i + 6, events.length); j++) {
      if (events[j].tag === "[JPA_HW_DRAWING]") {
        return { check: e.payload, drawing: JSON.parse(events[j].payload), t: e.t };
      }
    }
  }
  return null;
}

function recognizeSoftware(drawing, alphabet, expectedRo) {
  const { rgba, width, height } = rasterizeDrawingRgba(drawing, LOGICAL_PAD);
  const ink = extractInkFromRgba(rgba, width, height);
  return {
    inkCount: ink?.count ?? 0,
    result: matchInk({ ink, drawing, alphabet, expectedRo, templates }),
  };
}

const human = eventsInRange(1789880440000, 1789880620000);
const cases = [
  drawingAfterCheck(human, (p) => p.includes("ro=shi alpha=kata") && p.includes("best=so") && p.includes("score=0.588")),
  drawingAfterCheck(human, (p) => p.includes("ro=tsu alpha=kata") && p.includes("best=ge")),
  drawingAfterCheck(human, (p) => p.includes("ro=so alpha=kata") && p.includes("best=tsu")),
  drawingAfterCheck(human, (p) => p.includes("ro=n alpha=kata") && p.includes("best=so")),
  drawingAfterCheck(human, (p) => p.includes("ro=ki alpha=hira")),
  drawingAfterCheck(human, (p) => p.includes("ro=a alpha=kata")),
  drawingAfterCheck(human, (p) => p.includes("ro=a alpha=hira") && p.includes("status=ok")),
];

for (const c of cases) {
  if (!c) {
    console.log("MISSING_CASE");
    continue;
  }
  const m = String(c.check).match(/ro=(\w+) alpha=(hira|kata)/);
  const expectedRo = m[1];
  const alphabet = m[2];
  const soft = recognizeSoftware(c.drawing, alphabet, expectedRo);
  const skiaBits = String(c.check).match(/status=(\w+) score=([0-9.null]+) best=(\w+|null) .* ink=(\d+)/);
  console.log(JSON.stringify({
    t: c.t,
    deviceCheck: c.check,
    soft: {
      status: soft.result.status,
      score: soft.result.status === "empty" ? null : soft.result.expectedScore,
      best: soft.result.status === "empty" ? null : soft.result.best?.ro,
      ink: soft.inkCount,
    },
    skiaFromLog: skiaBits ? {
      status: skiaBits[1],
      score: skiaBits[2],
      best: skiaBits[3],
      ink: Number(skiaBits[4]),
    } : null,
    strokes: c.drawing.length,
    pts: c.drawing.reduce((n, s) => n + s.length, 0),
  }, null, 2));
}

const ki = drawingAfterCheck(human, (p) => p.includes("ro=ki alpha=hira"));
if (ki) {
  fs.writeFileSync(
    "E:/Japanese Practicing Application/apps/mobile/.expo/dev/tmp-ki-drawing.json",
    JSON.stringify({
      id: "android-hira-ki-human-2026-09-20",
      alphabet: "hira",
      expectedRo: "ki",
      device: "CPH2873",
      capturedAt: new Date().toISOString(),
      note: "Recovered from JPA_HW_DRAWING; Capture fixture button was not used. Check was bad.",
      checkLine: ki.check,
      drawing: ki.drawing,
    }, null, 2),
  );
  console.log("WROTE_KI_TMP", ki.drawing.length, ki.drawing.reduce((n, s) => n + s.length, 0));
}
