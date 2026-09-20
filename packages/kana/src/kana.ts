export type Letter = {
  ro: string;
  hira: string;
  kata: string;
};

export type KanaRow = {
  id: string;
  title: string;
  cells: Array<Letter | null>;
};

export type ChartSection = {
  id: string;
  titleKey: string;
  /** Columns are the a/i/u/e/o positions; holes stay null so rows are always 5 wide. */
  rows: KanaRow[];
};

const L = (ro: string, hira: string, kata: string): Letter => ({ ro, hira, kata });

export const BASIC_ROWS: KanaRow[] = [
  { id: "a", title: "あ row", cells: [L("a", "あ", "ア"), L("i", "い", "イ"), L("u", "う", "ウ"), L("e", "え", "エ"), L("o", "お", "オ")] },
  { id: "ka", title: "か row", cells: [L("ka", "か", "カ"), L("ki", "き", "キ"), L("ku", "く", "ク"), L("ke", "け", "ケ"), L("ko", "こ", "コ")] },
  { id: "sa", title: "さ row", cells: [L("sa", "さ", "サ"), L("shi", "し", "シ"), L("su", "す", "ス"), L("se", "せ", "セ"), L("so", "そ", "ソ")] },
  { id: "ta", title: "た row", cells: [L("ta", "た", "タ"), L("chi", "ち", "チ"), L("tsu", "つ", "ツ"), L("te", "て", "テ"), L("to", "と", "ト")] },
  { id: "na", title: "な row", cells: [L("na", "な", "ナ"), L("ni", "に", "ニ"), L("nu", "ぬ", "ヌ"), L("ne", "ね", "ネ"), L("no", "の", "ノ")] },
  { id: "ha", title: "は row", cells: [L("ha", "は", "ハ"), L("hi", "ひ", "ヒ"), L("fu", "ふ", "フ"), L("he", "へ", "ヘ"), L("ho", "ほ", "ホ")] },
  { id: "ma", title: "ま row", cells: [L("ma", "ま", "マ"), L("mi", "み", "ミ"), L("mu", "む", "ム"), L("me", "め", "メ"), L("mo", "も", "モ")] },
  { id: "ya", title: "や row", cells: [L("ya", "や", "ヤ"), null, L("yu", "ゆ", "ユ"), null, L("yo", "よ", "ヨ")] },
  { id: "ra", title: "ら row", cells: [L("ra", "ら", "ラ"), L("ri", "り", "リ"), L("ru", "る", "ル"), L("re", "れ", "レ"), L("ro", "ろ", "ロ")] },
  { id: "wa", title: "わ row", cells: [L("wa", "わ", "ワ"), null, null, null, L("wo", "を", "ヲ")] },
  { id: "n", title: "ん", cells: [L("n", "ん", "ン"), null, null, null, null] },
];

export const VOICED_ROWS: KanaRow[] = [
  { id: "ga", title: "が row", cells: [L("ga", "が", "ガ"), L("gi", "ぎ", "ギ"), L("gu", "ぐ", "グ"), L("ge", "げ", "ゲ"), L("go", "ご", "ゴ")] },
  { id: "za", title: "ざ row", cells: [L("za", "ざ", "ザ"), L("ji", "じ", "ジ"), L("zu", "ず", "ズ"), L("ze", "ぜ", "ゼ"), L("zo", "ぞ", "ゾ")] },
  { id: "da", title: "だ row", cells: [L("da", "だ", "ダ"), L("dji", "ぢ", "ヂ"), L("dzu", "づ", "ヅ"), L("de", "で", "デ"), L("do", "ど", "ド")] },
  { id: "ba", title: "ば row", cells: [L("ba", "ば", "バ"), L("bi", "び", "ビ"), L("bu", "ぶ", "ブ"), L("be", "べ", "ベ"), L("bo", "ぼ", "ボ")] },
  { id: "pa", title: "ぱ row", cells: [L("pa", "ぱ", "パ"), L("pi", "ぴ", "ピ"), L("pu", "ぷ", "プ"), L("pe", "ぺ", "ペ"), L("po", "ぽ", "ポ")] },
];

export const YOON_ROWS: KanaRow[] = [
  { id: "yoon-k", title: "きゃ", cells: [L("kya", "きゃ", "キャ"), L("kyu", "きゅ", "キュ"), L("kyo", "きょ", "キョ"), null, null] },
  { id: "yoon-s", title: "しゃ", cells: [L("sha", "しゃ", "シャ"), L("shu", "しゅ", "シュ"), L("sho", "しょ", "ショ"), null, null] },
  { id: "yoon-c", title: "ちゃ", cells: [L("cha", "ちゃ", "チャ"), L("chu", "ちゅ", "チュ"), L("cho", "ちょ", "チョ"), null, null] },
  { id: "yoon-n", title: "にゃ", cells: [L("nya", "にゃ", "ニャ"), L("nyu", "にゅ", "ニュ"), L("nyo", "にょ", "ニョ"), null, null] },
  { id: "yoon-h", title: "ひゃ", cells: [L("hya", "ひゃ", "ヒャ"), L("hyu", "ひゅ", "ヒュ"), L("hyo", "ひょ", "ヒョ"), null, null] },
  { id: "yoon-m", title: "みゃ", cells: [L("mya", "みゃ", "ミャ"), L("myu", "みゅ", "ミュ"), L("myo", "みょ", "ミョ"), null, null] },
  { id: "yoon-r", title: "りゃ", cells: [L("rya", "りゃ", "リャ"), L("ryu", "りゅ", "リュ"), L("ryo", "りょ", "リョ"), null, null] },
  { id: "yoon-g", title: "ぎゃ", cells: [L("gya", "ぎゃ", "ギャ"), L("gyu", "ぎゅ", "ギュ"), L("gyo", "ぎょ", "ギョ"), null, null] },
  { id: "yoon-j", title: "じゃ", cells: [L("ja", "じゃ", "ジャ"), L("ju", "じゅ", "ジュ"), L("jo", "じょ", "ジョ"), null, null] },
  { id: "yoon-b", title: "びゃ", cells: [L("bya", "びゃ", "ビャ"), L("byu", "びゅ", "ビュ"), L("byo", "びょ", "ビョ"), null, null] },
  { id: "yoon-p", title: "ぴゃ", cells: [L("pya", "ぴゃ", "ピャ"), L("pyu", "ぴゅ", "ピュ"), L("pyo", "ぴょ", "ピョ"), null, null] },
];

/** Every row in every section has exactly 5 cell slots. */
export const CHART_COLUMNS = 5;

/** Column headings for the gojūon grid. Yōon rows do not follow these vowels. */
export const CHART_VOWELS = ["a", "i", "u", "e", "o"] as const;

export const CHART: ChartSection[] = [
  { id: "basic", titleKey: "chart_basic", rows: BASIC_ROWS },
  { id: "dakuten", titleKey: "chart_voiced", rows: VOICED_ROWS },
  { id: "yoon", titleKey: "chart_yoon", rows: YOON_ROWS },
];

export const BASIC: Letter[] = BASIC_ROWS.flatMap((r) => r.cells.filter((c): c is Letter => Boolean(c)));
export const VOICED: Letter[] = VOICED_ROWS.flatMap((r) => r.cells.filter((c): c is Letter => Boolean(c)));
export const YOON: Letter[] = YOON_ROWS.flatMap((r) => r.cells.filter((c): c is Letter => Boolean(c)));
export const FULL71: Letter[] = [...BASIC, ...VOICED];
export const ALL: Letter[] = [...FULL71, ...YOON];
export const BY_RO: Record<string, Letter> = Object.fromEntries(ALL.map((l) => [l.ro, l]));

export const CONFUSABLE_GROUPS: string[][] = [
  ["me", "nu"],
  ["ne", "re", "wa"],
  ["ru", "ro"],
  ["ha", "ho"],
  ["yo", "ma"],
  ["shi", "tsu"],
  ["so", "n"],
];

const MATCH_PEER_GROUPS: string[][] = [
  ...CONFUSABLE_GROUPS,
  ["shi", "tsu", "so", "n"],
  ["fu", "wa", "u", "ra"],
  ["ku", "ke", "ta"],
  ["sa", "se", "ki"],
  ["chi", "te"],
  ["su", "nu"],
  ["i", "ri", "to"],
  ["ko", "yu"],
];

const ROW_MAP: Record<string, Letter[]> = Object.fromEntries(
  [...BASIC_ROWS, ...VOICED_ROWS].map((r) => [r.id, r.cells.filter((c): c is Letter => Boolean(c))]),
);

export const SET_COUNTS = {
  basic46: BASIC.length,
  voiced: VOICED.length,
  yoon: YOON.length,
  full71: FULL71.length,
  all: ALL.length,
};

export function lettersFor(setId: string): Letter[] {
  if (setId === "basic46") return BASIC.slice();
  if (setId === "voiced") return VOICED.slice();
  if (setId === "yoon") return YOON.slice();
  if (setId === "full71") return FULL71.slice();
  if (setId === "all") return ALL.slice();
  if (setId === "lookalikes") {
    const ros = new Set(CONFUSABLE_GROUPS.flat());
    return ALL.filter((l) => ros.has(l.ro) && l.hira.length === 1);
  }
  if (ROW_MAP[setId]) return ROW_MAP[setId].slice();
  return FULL71.slice();
}

export const ROMAJI_ALIASES: Record<string, string[]> = {
  sha: ["sya"],
  shu: ["syu"],
  sho: ["syo"],
  cha: ["tya", "cya"],
  chu: ["tyu", "cyu"],
  cho: ["tyo", "cyo"],
  ja: ["zya", "jya"],
  ju: ["zyu", "jyu"],
  jo: ["zyo", "jyo"],
  shi: ["si"],
  chi: ["ti"],
  tsu: ["tu"],
  fu: ["hu"],
  ji: ["zi"],
  dji: ["di", "ji"],
  dzu: ["du", "zu"],
  wo: ["o"],
};

export function confusablePeers(ro: string): string[] {
  const group = CONFUSABLE_GROUPS.find((g) => g.includes(ro));
  return group ? group.filter((item) => item !== ro) : [];
}

export function matchPeers(ro: string): string[] {
  const set = new Set<string>();
  MATCH_PEER_GROUPS.forEach((group) => {
    if (!group.includes(ro)) return;
    group.forEach((item) => {
      if (item !== ro) set.add(item);
    });
  });
  return [...set];
}

export function setLabelKana(row: KanaRow): string {
  return (row.title.match(/[ぁ-んァ-ンー]+/) || [row.id])[0];
}
