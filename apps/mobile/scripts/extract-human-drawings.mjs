import fs from "fs";

const logPath = new URL("../.expo/dev/logs/start.log", import.meta.url);
const lines = fs.readFileSync(logPath, "utf8").split(/\n/);

function parseLine(line) {
  try {
    return JSON.parse(line);
  } catch {
    return null;
  }
}

function extractPair(ro, tMin, tMax) {
  let check = null;
  let drawing = null;
  for (const line of lines) {
    const obj = parseLine(line);
    if (!obj || typeof obj._t !== "number") continue;
    if (obj._t < tMin || obj._t > tMax) continue;
    const data = obj.data;
    if (!Array.isArray(data)) continue;
    if (data[0] === "[JPA_HW_CHECK]" && String(data[1]).includes(`ro=${ro}`)) {
      check = { t: obj._t, line: data[1] };
    }
    if (data[0] === "[JPA_HW_DRAWING]" && check && !drawing) {
      drawing = JSON.parse(data[1]);
    }
  }
  return { check, drawing };
}

const shi = extractPair("shi", 1789880540000, 1789880550000);
const ki = extractPair("ki", 1789880460000, 1789880470000);
const aKata = extractPair("a alpha=kata", 1789880520000, 1789880530000);

// Fix aKata search
let aKataCheck = null;
let aKataDrawing = null;
for (const line of lines) {
  const obj = parseLine(line);
  if (!obj || obj._t < 1789880527000 || obj._t > 1789880528000) continue;
  const data = obj.data;
  if (!Array.isArray(data)) continue;
  if (data[0] === "[JPA_HW_CHECK]" && String(data[1]).includes("ro=a alpha=kata")) {
    aKataCheck = data[1];
  }
  if (data[0] === "[JPA_HW_DRAWING]" && aKataCheck && !aKataDrawing) {
    aKataDrawing = JSON.parse(data[1]);
  }
}

console.log("shi check", shi.check?.line);
console.log("shi strokes", shi.drawing?.length);
console.log("ki check", ki.check?.line);
console.log("ki strokes", ki.drawing?.length, "pts", ki.drawing?.reduce((n, s) => n + s.length, 0));
console.log("a kata check", aKataCheck);

const outDir = new URL("../.expo/dev/", import.meta.url);
if (shi.drawing) {
  fs.writeFileSync(new URL("tmp-shi-drawing.json", outDir), JSON.stringify(shi.drawing));
}
if (ki.drawing) {
  fs.writeFileSync(
    new URL("tmp-ki-drawing.json", outDir),
    JSON.stringify({
      id: "android-hira-ki-human-2026-09-20",
      alphabet: "hira",
      expectedRo: "ki",
      device: "CPH2873",
      capturedAt: new Date().toISOString(),
      note: "Recovered from JPA_HW_DRAWING beside Check; status=bad score≈0.509 best=sa. Not Capture-fixture button.",
      checkLine: ki.check?.line,
      drawing: ki.drawing,
    }, null, 2),
  );
}
if (aKataDrawing) {
  fs.writeFileSync(new URL("tmp-kata-a-drawing.json", outDir), JSON.stringify(aKataDrawing));
}
