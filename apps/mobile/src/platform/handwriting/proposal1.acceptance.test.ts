/**
 * PHASE 9D Proposal 1 — human corpus + negative controls.
 * Phase 9C historical artifacts under packages/handwriting/investigation/phase9c/ are unchanged.
 */
import { describe, expect, it } from "vitest";
import packedGlyphs from "@jpa/handwriting/templates/glyphs.json";
import {
  LOGICAL_PAD,
  extractInkFromRgba,
  loadGlyphTemplates,
  matchInk,
  matchInkUnoptimized,
  rasterizeDrawingRgba,
  type Drawing,
} from "@jpa/handwriting";
import corpus from "./humanDrawings.corpus.json";

const templates = loadGlyphTemplates(packedGlyphs);

function run(drawing: Drawing, alphabet: "hira" | "kata", expectedRo: string) {
  const { rgba, width, height } = rasterizeDrawingRgba(drawing, LOGICAL_PAD);
  const ink = extractInkFromRgba(rgba, width, height);
  return matchInk({ ink, drawing, alphabet, expectedRo, templates });
}

function fixture(id: string) {
  const f = corpus.fixtures.find((x) => x.id === id);
  if (!f) throw new Error(`missing ${id}`);
  return f;
}

describe("PHASE 9D Proposal 1 — ア", () => {
  it("bad → ok via accepted_conditional_low_recall; globalBest=a", () => {
    const f = fixture("human-kata-a-1");
    expect(f.deviceBaseline?.status ?? f.baseline.status).toBeDefined();
    const r = run(f.drawing as Drawing, "kata", "a");
    expect(r.status).toBe("ok");
    if (r.status === "empty") return;
    expect(r.globalBest.ro).toBe("a");
    expect(r.best.ro).toBe("a");
    expect(r.acceptReason).toBe("accepted_conditional_low_recall");
  });

  it("rejects cross-expected evaluations", () => {
    const f = fixture("human-kata-a-1");
    for (const asRo of ["ka", "ma", "i", "u", "o", "chi", "te", "se", "n", "shi"]) {
      expect(run(f.drawing as Drawing, "kata", asRo).status, asRo).toBe("bad");
    }
  });
});

describe("PHASE 9D Proposal 1 — ン", () => {
  it("fixes n-1; leaves n-2/n-3 rejected (peer and/or conditional precision)", () => {
    const n1 = run(fixture("human-kata-n-1").drawing as Drawing, "kata", "n");
    expect(n1.status).toBe("ok");
    if (n1.status !== "empty") {
      expect(n1.globalBest.ro).toBe("n");
      expect(n1.acceptReason).toBe("accepted_conditional_low_recall");
    }
    const n2 = run(fixture("human-kata-n-2").drawing as Drawing, "kata", "n");
    expect(n2.status).toBe("bad");
    if (n2.status !== "empty") {
      expect(n2.globalBest.ro).toBe("n");
      expect(n2.acceptReason).toBe("rejected_peer");
    }
    const n3 = run(fixture("human-kata-n-3").drawing as Drawing, "kata", "n");
    expect(n3.status).toBe("bad");
    if (n3.status !== "empty") {
      expect(n3.globalBest.ro).toBe("n");
      // prec 0.982 < 0.99 and peerGap also fails — precision gate reported first
      expect(["rejected_conditional_precision", "rejected_peer"]).toContain(n3.acceptReason);
    }
  });

  it("rejects n-1 Drawing as シ/ツ/ソ", () => {
    const f = fixture("human-kata-n-1");
    for (const asRo of ["shi", "tsu", "so"]) {
      expect(run(f.drawing as Drawing, "kata", asRo).status, asRo).toBe("bad");
    }
  });
});

describe("PHASE 9D Proposal 1 — non-goals remain bad", () => {
  it("does not fix き/カ/シ/ツ/ソ", () => {
    for (const id of [
      "human-hira-ki-1",
      "human-kata-ka-1",
      "human-kata-shi-1",
      "human-kata-shi-2",
      "human-kata-shi-3",
      "human-kata-shi-4",
      "human-kata-tsu-1",
      "human-kata-tsu-2",
      "human-kata-tsu-3",
      "human-kata-so-1",
      "human-kata-so-2",
    ]) {
      const f = fixture(id);
      expect(run(f.drawing as Drawing, f.alphabet as "hira" | "kata", f.expectedRo).status, id).toBe("bad");
    }
  });
});

describe("PHASE 9D Proposal 1 — scribbles", () => {
  it("rejects tiny / short / sparse controls", () => {
    expect(run([[{ x: 128, y: 128 }]], "kata", "a").status).toBe("empty");
    const short = run([[{ x: 100, y: 120 }, { x: 160, y: 118 }]], "kata", "a");
    if (short.status !== "empty") expect(short.status).toBe("bad");
    const zig = run(
      [[{ x: 80, y: 80 }, { x: 100, y: 100 }, { x: 90, y: 120 }, { x: 120, y: 140 }]],
      "kata",
      "n",
    );
    if (zig.status !== "empty") expect(zig.status).toBe("bad");
  });
});

describe("PHASE 9D Proposal 1 — optimized ≡ naive on changed fixtures", () => {
  for (const id of ["human-kata-a-1", "human-kata-n-1"]) {
    it(id, () => {
      const f = fixture(id);
      const { rgba, width, height } = rasterizeDrawingRgba(f.drawing as Drawing, LOGICAL_PAD);
      const input = {
        ink: extractInkFromRgba(rgba, width, height),
        drawing: f.drawing as Drawing,
        alphabet: "kata" as const,
        expectedRo: f.expectedRo,
        templates,
      };
      const fast = matchInk(input);
      const naive = matchInkUnoptimized(input);
      expect(fast.status).toBe(naive.status);
      if (fast.status === "empty" || naive.status === "empty") return;
      expect(fast.acceptReason).toBe(naive.acceptReason);
      expect(fast.globalBest.ro).toBe(naive.globalBest.ro);
      expect(fast.best.ro).toBe(naive.best.ro);
    });
  }
});
