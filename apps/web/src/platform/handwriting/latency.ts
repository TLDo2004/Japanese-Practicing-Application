import { ALL } from "@jpa/kana";
import { matchInk, type Alphabet, type BinaryInk } from "@jpa/handwriting";
import { getGlyphTemplates, templatesForLetters } from "./recognize";

const SAMPLES: Array<{ ro: string; alphabet: Alphabet }> = [
  { ro: "a", alphabet: "hira" },
  { ro: "a", alphabet: "kata" },
  { ro: "kya", alphabet: "hira" },
  { ro: "shi", alphabet: "kata" },
  { ro: "tsu", alphabet: "kata" },
  { ro: "so", alphabet: "kata" },
  { ro: "n", alphabet: "kata" },
];

function inkFromMask(mask: Uint8Array, n: number): BinaryInk {
  let count = 0;
  let minX = n;
  let minY = n;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      if (!mask[y * n + x]) continue;
      count++;
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
  }
  return { ink: mask, w: n, h: n, minX, minY, maxX, maxY, count };
}

export function measurePackedGlyphLatency(rounds = 3): { median: number; worst: number; samples: number; labels: string[] } {
  const templates = getGlyphTemplates();
  const filtered = templatesForLetters(ALL);
  const times: number[] = [];
  const labels: string[] = [];
  for (let round = 0; round < rounds; round++) {
    for (const sample of SAMPLES) {
      const glyph = templates[sample.alphabet].find((item) => item.ro === sample.ro);
      if (!glyph) continue;
      const ink = inkFromMask(glyph.mask, 56);
      const started = performance.now();
      matchInk({
        ink,
        drawing: [],
        alphabet: sample.alphabet,
        expectedRo: sample.ro,
        templates: filtered,
      });
      const elapsed = performance.now() - started;
      times.push(elapsed);
      if (round === 0) labels.push(`${sample.alphabet}:${sample.ro}`);
    }
  }
  if (!times.length) return { median: 0, worst: 0, samples: 0, labels };
  const sorted = [...times].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const median = sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  return { median, worst: sorted[sorted.length - 1], samples: sorted.length, labels };
}
