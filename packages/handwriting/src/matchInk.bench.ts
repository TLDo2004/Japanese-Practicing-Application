/**
 * Deterministic matchInk benchmark — no UI, Skia, gestures, storage, or session.
 * Uses oracle BinaryInk / glyph-derived ink so Node, Chromium, and Hermes share work.
 */
import { matchInk } from "./matchInk";
import { matchInkUnoptimized } from "./matchInk.naive";
import { MASK_SIZE } from "./constants";
import {
  beginMatchProfile,
  endMatchProfile,
  getTemplateLoadStats,
  resetTemplateLoadStats,
  type MatchProfileSnapshot,
} from "./matchProfile";
import { loadGlyphTemplates, unpackInk, type PackedGlyphFile, type PackedInk } from "./templates";
import type { Alphabet, BinaryInk, Drawing, GlyphTemplateSet, MatchResult } from "./types";
import glyphsJson from "../templates/glyphs.json";
import fixturesJson from "../templates/fixtures.json";

type Fixture = {
  id: string;
  alphabet: Alphabet;
  expectedRo: string;
  drawing: Drawing;
  ink: PackedInk | null;
};

const glyphs = glyphsJson as PackedGlyphFile;
const fixtures = (fixturesJson as { fixtures: Fixture[] }).fixtures;
const templates: GlyphTemplateSet = loadGlyphTemplates(glyphs);

export type BenchCaseId =
  | "hira:a"
  | "hira:ki"
  | "hira:kya"
  | "kata:shi"
  | "kata:tsu"
  | "kata:so"
  | "kata:n";

export type BenchCase = {
  id: BenchCaseId;
  fixtureId: string;
  alphabet: Alphabet;
  expectedRo: string;
  ink: BinaryInk;
  drawing: Drawing;
};

export type BenchCaseResult = {
  id: BenchCaseId;
  fixtureId: string;
  alphabet: Alphabet;
  expectedRo: string;
  status: MatchResult["status"];
  expectedScore: number | null;
  bestRo: string | null;
  timesMs: number[];
  medianMs: number;
  minMs: number;
  maxMs: number;
  naiveMedianMs: number | null;
  naiveTimesMs: number[];
  profile: MatchProfileSnapshot | null;
};

export type BenchReport = {
  runtime: string;
  warmup: number;
  rounds: number;
  templateCounts: { hira: number; kata: number };
  loadStats: ReturnType<typeof getTemplateLoadStats>;
  cases: BenchCaseResult[];
};

function nowMs(): number {
  return typeof performance !== "undefined" ? performance.now() : Date.now();
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (!sorted.length) return 0;
  return sorted.length % 2 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2;
}

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
  return {
    ink: mask,
    w: n,
    h: n,
    minX: count ? minX : 0,
    minY: count ? minY : 0,
    maxX: count ? maxX : 0,
    maxY: count ? maxY : 0,
    count,
  };
}

function fixtureInk(id: string): { fixture: Fixture; ink: BinaryInk } {
  const fixture = fixtures.find((f) => f.id === id);
  if (!fixture) throw new Error(`missing oracle fixture ${id}`);
  if (!fixture.ink) throw new Error(`fixture ${id} has no packed ink`);
  return { fixture, ink: unpackInk(fixture.ink) };
}

function kiInk(): BinaryInk {
  const glyph = templates.hira.find((item) => item.ro === "ki");
  if (!glyph) throw new Error("missing hira:ki template");
  return inkFromMask(glyph.mask, MASK_SIZE);
}

export function getBenchTemplates(): GlyphTemplateSet {
  return templates;
}

export function getBenchCases(): BenchCase[] {
  const a = fixtureInk("hira-a-glyph-ok");
  const kya = fixtureInk("hira-kya-combo-ok");
  const shi = fixtureInk("kata-shi-glyph-ok");
  const tsu = fixtureInk("kata-tsu-glyph-ok");
  const so = fixtureInk("kata-so-glyph-ok");
  const n = fixtureInk("kata-n-glyph-ok");
  return [
    {
      id: "hira:a",
      fixtureId: a.fixture.id,
      alphabet: "hira",
      expectedRo: "a",
      ink: a.ink,
      drawing: a.fixture.drawing,
    },
    {
      id: "hira:ki",
      fixtureId: "hira-ki-template-mask",
      alphabet: "hira",
      expectedRo: "ki",
      ink: kiInk(),
      drawing: [],
    },
    {
      id: "hira:kya",
      fixtureId: kya.fixture.id,
      alphabet: "hira",
      expectedRo: "kya",
      ink: kya.ink,
      drawing: kya.fixture.drawing,
    },
    {
      id: "kata:shi",
      fixtureId: shi.fixture.id,
      alphabet: "kata",
      expectedRo: "shi",
      ink: shi.ink,
      drawing: shi.fixture.drawing,
    },
    {
      id: "kata:tsu",
      fixtureId: tsu.fixture.id,
      alphabet: "kata",
      expectedRo: "tsu",
      ink: tsu.ink,
      drawing: tsu.fixture.drawing,
    },
    {
      id: "kata:so",
      fixtureId: so.fixture.id,
      alphabet: "kata",
      expectedRo: "so",
      ink: so.ink,
      drawing: so.fixture.drawing,
    },
    {
      id: "kata:n",
      fixtureId: n.fixture.id,
      alphabet: "kata",
      expectedRo: "n",
      ink: n.ink,
      drawing: n.fixture.drawing,
    },
  ];
}

export function detectRuntime(): string {
  const g = globalThis as {
    HermesInternal?: unknown;
    navigator?: { userAgent?: string };
    process?: { versions?: { node?: string } };
  };
  if (g.HermesInternal) return "hermes";
  if (g.process?.versions?.node) return `node ${g.process.versions.node}`;
  const ua = g.navigator?.userAgent;
  if (ua) return ua;
  return "unknown";
}

export function runMatchInkBench(opts?: {
  warmup?: number;
  rounds?: number;
  profile?: boolean;
  naive?: boolean;
  naiveRounds?: number;
}): BenchReport {
  const warmup = opts?.warmup ?? 1;
  const rounds = opts?.rounds ?? 5;
  const profile = opts?.profile ?? true;
  const naive = opts?.naive ?? true;
  const naiveRounds = opts?.naiveRounds ?? 1;
  const cases = getBenchCases();
  const matcher = matchInk;

  for (let i = 0; i < warmup; i++) {
    const c = cases[i % cases.length]!;
    matcher({
      ink: c.ink,
      drawing: c.drawing,
      alphabet: c.alphabet,
      expectedRo: c.expectedRo,
      templates,
    });
  }

  const results: BenchCaseResult[] = [];
  for (const c of cases) {
    const timesMs: number[] = [];
    const naiveTimesMs: number[] = [];
    let last: MatchResult | null = null;
    let lastProfile: MatchProfileSnapshot | null = null;
    if (naive) {
      for (let i = 0; i < naiveRounds; i++) {
        const t0 = nowMs();
        matchInkUnoptimized({
          ink: c.ink,
          drawing: c.drawing,
          alphabet: c.alphabet,
          expectedRo: c.expectedRo,
          templates,
        });
        naiveTimesMs.push(nowMs() - t0);
      }
    }
    for (let i = 0; i < rounds; i++) {
      if (profile) beginMatchProfile();
      const t0 = nowMs();
      last = matcher({
        ink: c.ink,
        drawing: c.drawing,
        alphabet: c.alphabet,
        expectedRo: c.expectedRo,
        templates,
      });
      const elapsed = nowMs() - t0;
      timesMs.push(elapsed);
      if (profile) lastProfile = endMatchProfile();
    }
    results.push({
      id: c.id,
      fixtureId: c.fixtureId,
      alphabet: c.alphabet,
      expectedRo: c.expectedRo,
      status: last?.status ?? "empty",
      expectedScore: last && last.status !== "empty" ? last.expectedScore : null,
      bestRo: last && last.status !== "empty" ? last.best.ro : null,
      timesMs,
      medianMs: median(timesMs),
      minMs: Math.min(...timesMs),
      maxMs: Math.max(...timesMs),
      naiveMedianMs: naiveTimesMs.length ? median(naiveTimesMs) : null,
      naiveTimesMs,
      profile: lastProfile,
    });
  }

  return {
    runtime: detectRuntime(),
    warmup,
    rounds,
    templateCounts: { hira: templates.hira.length, kata: templates.kata.length },
    loadStats: getTemplateLoadStats(),
    cases: results,
  };
}

export function resetBenchLoadStats() {
  resetTemplateLoadStats();
}
