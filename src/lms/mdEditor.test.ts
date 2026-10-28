import { expect, test } from "bun:test";
import { Schema } from "@milkdown/kit/prose/model";
import { isPlainDoc, plainDocJson, plainText } from "./mdEditor";

// Milkdown の commonmark と同じ名前の最小の schema
const schema = new Schema({
  nodes: {
    doc: { content: "block+" },
    paragraph: { content: "inline*", group: "block" },
    heading: { content: "inline*", group: "block", attrs: { level: { default: 1 } } },
    bullet_list: { content: "list_item+", group: "block" },
    list_item: { content: "paragraph+" },
    text: { group: "inline" },
    hardbreak: { group: "inline", inline: true },
  },
  marks: { strong: {} },
});
const doc = (...blocks: unknown[]) => schema.nodeFromJSON({ type: "doc", content: blocks });
const p = (...content: unknown[]) => ({ type: "paragraph", content });
const t = (text: string, marks?: unknown[]) => ({ type: "text", text, marks });

test("段落だけならプレーン、見出し・箇条書き・太字があれば違う", () => {
  const plain = doc(p(t("a"), { type: "hardbreak" }, t("b")), p(t("c")));
  expect(isPlainDoc(plain)).toBe(true);
  expect(plainText(plain)).toBe("a\nb\n\nc");
  expect(isPlainDoc(doc({ type: "heading", attrs: { level: 2 }, content: [t("a")] }))).toBe(false);
  expect(isPlainDoc(doc({ type: "bullet_list", content: [{ type: "list_item", content: [p(t("a"))] }] }))).toBe(false);
  expect(isPlainDoc(doc(p(t("a", [{ type: "strong" }]))))).toBe(false);
});

test("HTML 由来の文字から作った doc は見出しにならずプレーン", () => {
  const d = schema.nodeFromJSON(plainDocJson("# a\nb\n\nc"));
  expect(d.child(0).type.name).toBe("paragraph");
  expect(isPlainDoc(d)).toBe(true);
  expect(plainText(d)).toBe("# a\nb\n\nc");
  expect(isPlainDoc(schema.nodeFromJSON(plainDocJson("")))).toBe(true);
});
