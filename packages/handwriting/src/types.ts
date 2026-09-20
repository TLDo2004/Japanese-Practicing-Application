export type Point = {
  x: number;
  y: number;
};

export type Stroke = Point[];

export type Drawing = Stroke[];

export type BinaryInk = {
  ink: Uint8Array;
  w: number;
  h: number;
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  count: number;
};

export type GlyphMask = Uint8Array;

export type MatchMetrics = {
  score: number;
  recall: number;
  precision: number;
  iou: number;
};

export type MatchCandidate = {
  ro: string | null;
  ch: string;
  score: number;
};

export type Alphabet = "hira" | "kata";

export type GlyphTemplate = {
  ro: string;
  ch: string;
  mask: GlyphMask;
};

export type GlyphTemplateSet = {
  hira: GlyphTemplate[];
  kata: GlyphTemplate[];
};

export type MatchResult =
  | { status: "empty"; acceptReason?: "empty" }
  | {
    status: "ok" | "bad";
    expectedScore: number;
    best: MatchCandidate;
    /** Score argmax before pickShown / rival display selection. */
    globalBest: MatchCandidate;
    acceptReason: import("./acceptance").AcceptReason;
  };
