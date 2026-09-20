import type { RubyRun } from "./types";

function textNode(text: string): RubyRun {
  return text ? [{ kind: "text", text }] : [];
}

export function rubyFor(word: string, reading: string): RubyRun {
  if (!word) return textNode(reading || "");
  if (!reading || word === reading) return textNode(word);
  if (!/[\u4e00-\u9faf]/.test(word)) return textNode(word);
  let prefix = 0;
  while (prefix < word.length && prefix < reading.length && word[prefix] === reading[prefix]) prefix++;
  let suffix = 0;
  while (
    suffix < word.length - prefix &&
    suffix < reading.length - prefix &&
    word[word.length - 1 - suffix] === reading[reading.length - 1 - suffix]
  ) suffix++;
  const before = word.slice(0, prefix);
  const mid = word.slice(prefix, suffix ? word.length - suffix : word.length);
  const after = suffix ? word.slice(word.length - suffix) : "";
  const midRead = reading.slice(prefix, suffix ? reading.length - suffix : reading.length);
  if (!mid || !midRead) return textNode(word);
  const out: RubyRun = [];
  if (before) out.push({ kind: "text", text: before });
  out.push({ kind: "ruby", base: mid, rt: midRead });
  if (after) out.push({ kind: "text", text: after });
  return out;
}

export function rubyFromMarkup(furigana: string, word: string, reading: string): RubyRun {
  if (!furigana || furigana.indexOf("|") === -1) return rubyFor(word, reading);
  const out: RubyRun = [];
  const re = /\[([^\]|]+)\|([^\]]+)\]/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(furigana))) {
    const before = furigana.slice(last, m.index);
    if (before) out.push({ kind: "text", text: before });
    out.push({ kind: "ruby", base: m[1], rt: m[2] });
    last = m.index + m[0].length;
  }
  const tail = furigana.slice(last);
  if (tail) out.push({ kind: "text", text: tail });
  return out.length ? out : rubyFor(word, reading);
}
