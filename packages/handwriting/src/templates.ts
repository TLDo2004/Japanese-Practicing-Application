import { MASK_SIZE } from "./constants";
import { warmDilateCache } from "./dilate";
import { prefetchPackedMask } from "./metrics";
import { recordTemplateLoad, recordTemplateUnpack } from "./matchProfile";
import { packBits, unpackBits } from "./pack";
import type { BinaryInk, GlyphTemplateSet } from "./types";

export type PackedGlyph = {
  ro: string;
  ch: string;
  packed: string;
};

export type PackedGlyphFile = {
  generator: string;
  maskSize: number;
  fontFamily: string;
  fontWeight: number;
  canvas: number;
  hira: PackedGlyph[];
  kata: PackedGlyph[];
};

export type PackedInk = {
  w: number;
  h: number;
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  count: number;
  packed: string;
};

export function packInk(bin: BinaryInk): PackedInk {
  return {
    w: bin.w,
    h: bin.h,
    minX: bin.minX,
    minY: bin.minY,
    maxX: bin.maxX,
    maxY: bin.maxY,
    count: bin.count,
    packed: packBits(bin.ink),
  };
}

export function unpackInk(packed: PackedInk): BinaryInk {
  return {
    ink: unpackBits(packed.packed, packed.w * packed.h),
    w: packed.w,
    h: packed.h,
    minX: packed.minX,
    minY: packed.minY,
    maxX: packed.maxX,
    maxY: packed.maxY,
    count: packed.count,
  };
}

export function unpackGlyphFile(file: PackedGlyphFile): GlyphTemplateSet {
  recordTemplateUnpack();
  const unpackList = (list: PackedGlyph[]) => list.map((item) => ({
    ro: item.ro,
    ch: item.ch,
    mask: unpackBits(item.packed, file.maskSize * file.maskSize),
  }));
  return {
    hira: unpackList(file.hira),
    kata: unpackList(file.kata),
  };
}

function warmInvariantCaches(set: GlyphTemplateSet): void {
  for (const item of set.hira) {
    const dilated = warmDilateCache(item.mask, 2);
    prefetchPackedMask(item.mask);
    prefetchPackedMask(dilated);
  }
  for (const item of set.kata) {
    const dilated = warmDilateCache(item.mask, 3);
    prefetchPackedMask(item.mask);
    prefetchPackedMask(dilated);
  }
}

let cachedFile: PackedGlyphFile | null = null;
let cachedSet: GlyphTemplateSet | null = null;

export function loadGlyphTemplates(file: PackedGlyphFile): GlyphTemplateSet {
  if (cachedSet && cachedFile === file) {
    recordTemplateLoad(true);
    return cachedSet;
  }
  recordTemplateLoad(false);
  cachedFile = file;
  cachedSet = unpackGlyphFile(file);
  if (file.maskSize === MASK_SIZE) warmInvariantCaches(cachedSet);
  return cachedSet;
}
