import { expect, test } from "bun:test";
import { renderToString } from "react-dom/server";
import type { GenericPage } from "@/muscat/api/types";
import { fakeClient } from "../fakeClient";
import { GenericScreen } from "./GenericScreen";
import type { LiveState } from "./useLivePage";

const client = fakeClient();
const doc = new DOMParser().parseFromString("<p>x</p>", "text/html");
const render = (initial?: LiveState) => renderToString(<GenericScreen client={client} doc={doc} initial={initial} />);

const page: GenericPage = {
  blocks: [
    { kind: "line", items: [{ kind: "text", text: "先頭の文" }] },
    { kind: "heading", text: "見出しA", level: 2 },
    { kind: "line", items: [{ kind: "text", text: "対象のデータが存在しません。" }], tone: "notice" },
    { kind: "tabs", tabs: [{ label: "タブ一", ref: "t1", selected: true, disabled: false }, { label: "タブ二", ref: "t2", selected: false, disabled: true }] },
    { kind: "heading", text: "小見出し", level: 3 },
    {
      kind: "fields",
      rows: [
        { label: "項目1", text: "値1", controls: [] },
        { label: "メモ", text: "", controls: [{ kind: "text", ref: "c1", label: "メモ", value: "入力済み", disabled: false }] },
      ],
    },
    {
      kind: "table",
      headers: ["列X", "列Y"],
      rows: [[{ text: "セル1", controls: [] }, { text: "", controls: [{ kind: "checkbox", ref: "c2", label: "選択", checked: true, disabled: false }] }]],
    },
    { kind: "heading", text: "見出しB", level: 1 },
    {
      kind: "line",
      items: [
        { kind: "text", text: "学部" },
        { kind: "select", ref: "c3", label: "学部", value: "2", options: [{ value: "1", label: "文学部" }, { value: "2", label: "理学部" }], disabled: false },
        { kind: "radio", ref: "c4", name: "g", label: "甲", value: "a", checked: true, disabled: false },
        { kind: "textarea", ref: "c5", label: "本文", value: "長文", disabled: false },
        { kind: "button", ref: "c6", label: "保存", disabled: false, as: "button" },
        { kind: "button", ref: "c7", label: "削除", disabled: true, as: "button" },
        { kind: "button", ref: "c8", label: "詳細リンク", disabled: false, as: "link" },
      ],
    },
  ],
};

const html = render({ status: "ready", page });

test("見出し(level 1〜2)ごとにカードにまとめ、最初の見出しより前はカードに入れない", () => {
  expect(html.match(/aria-expanded="true"/g)?.length).toBe(2);
  expect(html.indexOf("先頭の文")).toBeLessThan(html.indexOf("見出しA"));
  expect(html.indexOf("見出しA")).toBeLessThan(html.indexOf("対象のデータ"));
  expect(html.indexOf("対象のデータ")).toBeLessThan(html.indexOf("見出しB"));
  expect(html.indexOf("見出しB")).toBeLessThan(html.indexOf("詳細リンク"));
  expect(html).toContain("小見出し");
});

test("文字だけの line は <p>", () => {
  expect(html).toMatch(/<p class="text-sm ">先頭の文<\/p>/);
  expect(html).toMatch(/<p class="text-sm rounded-md bg-muted[^"]*">対象のデータが存在しません。<\/p>/);
});

test("タブの帯", () => {
  expect(html).toContain('role="tablist"');
  expect(html).toMatch(/aria-selected="true"[^>]*>タブ一/);
  expect(html).toMatch(/aria-selected="false"[^>]*>タブ二/);
  // 元のページで無効なタブは押せない(クラス名の disabled: と区別するため、属性の disabled="" を見る)
  expect(html).toMatch(/ disabled=""[^>]*>タブ二/);
  expect(html).not.toMatch(/ disabled=""[^>]*>タブ一/);
});

test("fields の格子と表", () => {
  for (const s of ["<dl", "項目1", "値1", "入力済み", "<table", "列X", "セル1"]) expect(html).toContain(s);
  expect(html).toMatch(/type="checkbox"[^>]*checked/);
});

test("line の中の部品とボタン(link / button)", () => {
  for (const s of ["文学部", "理学部", "長文", "保存"]) expect(html).toContain(s);
  expect(html).toMatch(/type="radio"[^>]*checked/);
  expect(html).toMatch(/<button[^>]*disabled[^>]*>削除/);
  expect(html).toMatch(/<button[^>]*underline[^>]*>詳細リンク/);
  expect(html).not.toMatch(/<button[^>]*underline[^>]*>保存/);
});

test("エラー・読み込み中", () => {
  expect(render({ status: "error", error: "MUSCAT が応答しません" })).toContain("応答しません");
  expect(render()).toContain("読み込み中");
});
