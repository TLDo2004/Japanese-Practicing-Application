export type {
  Point,
  Stroke,
  Drawing,
  BinaryInk,
  GlyphMask,
  MatchMetrics,
  MatchCandidate,
  MatchResult,
  Alphabet,
  GlyphTemplate,
  GlyphTemplateSet,
} from "./types";
export type { MatchInkInput } from "./matchInk";
export type { PackedGlyphFile, PackedInk } from "./templates";
export { MASK_SIZE, INK_ALPHA_THRESHOLD } from "./constants";
export { RASTER_SPEC } from "./raster-spec";
export {
  LOGICAL_PAD,
  rasterizeDrawingRgba,
  displayToLogical,
  logicalToDisplay,
  cloneDrawing,
} from "./rasterizeDrawing";
export type { RgbaRaster } from "./rasterizeDrawing";

export { extractInkFromRgba } from "./extract";
export { matchInk } from "./matchInk";
export { matchInkUnoptimized } from "./matchInk.naive";
export { diagnoseMatchInk } from "./diagnoseMatchInk";
export type { MatchDiagnosis, CandidateDiag, RejectionReason } from "./diagnoseMatchInk";
export {
  conditionalLowRecallAccept,
  classifyRejectReason,
  CONDITIONAL_LOW_RECALL_MIN_PRECISION,
  CONDITIONAL_LOW_RECALL_FLOOR,
} from "./acceptance";
export type { AcceptReason } from "./acceptance";
export { unpackGlyphFile, unpackInk, loadGlyphTemplates } from "./templates";
export {
  beginMatchProfile,
  endMatchProfile,
  getTemplateLoadStats,
} from "./matchProfile";
export type { MatchProfileSnapshot, TemplateLoadStats } from "./matchProfile";
