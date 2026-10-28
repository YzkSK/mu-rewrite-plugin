import type { Node } from "@milkdown/kit/prose/model";

type JSONValue = string | number | boolean | null | JSONValue[] | { [key: string]: JSONValue };

/** 記法を一つも使っていない(段落だけで、中身は装飾なしの文字と改行だけ)か */
export function isPlainDoc(doc: Node): boolean {
  let plain = true;
  doc.forEach((block) => {
    if (block.type.name !== "paragraph") return void (plain = false);
    block.forEach((n) => { if (!(n.isText && !n.marks.length) && n.type.name !== "hardbreak") plain = false; });
  });
  return plain;
}

/** isPlainDoc な doc → 平文。段落は空行、段落内の改行は改行 */
export function plainText(doc: Node): string {
  const out: string[] = [];
  doc.forEach((block) => {
    let s = "";
    block.forEach((n) => { s += n.isText ? n.text : "\n"; });
    out.push(s);
  });
  return out.join("\n\n");
}

/** 平文 → エディタの初期 doc(JSON)。Markdown として parse しないので、先頭の # などが見出しにならない */
export function plainDocJson(text: string): Record<string, JSONValue> {
  const content = text.split(/\n[^\S\n]*\n/).map((p) => ({
    type: "paragraph",
    content: p.split("\n").flatMap((line, i): Record<string, JSONValue>[] => [...(i ? [{ type: "hardbreak" }] : []), ...(line ? [{ type: "text", text: line }] : [])]),
  }));
  return { type: "doc", content };
}
