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
    { kind: "heading", text: "見出しA" },
    { kind: "message", text: "対象のデータが存在しません。" },
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
    {
      kind: "controls",
      controls: [
        { kind: "select", ref: "c3", label: "学部", value: "2", options: [{ value: "1", label: "文学部" }, { value: "2", label: "理学部" }], disabled: false },
        { kind: "radio", ref: "c4", name: "g", label: "甲", value: "a", checked: true, disabled: false },
        { kind: "textarea", ref: "c5", label: "本文", value: "長文", disabled: false },
        { kind: "button", ref: "c6", label: "保存", disabled: false },
        { kind: "button", ref: "c7", label: "削除", disabled: true },
      ],
    },
  ],
};

test("各 block を描く", () => {
  const html = render({ status: "ready", page });
  for (const s of ["見出しA", "対象のデータが存在しません。", "項目1", "値1", "入力済み", "列X", "セル1", "文学部", "理学部", "甲", "長文", "保存", "削除", "<dl", "<table"]) {
    expect(html).toContain(s);
  }
  expect(html).toMatch(/type="checkbox"[^>]*checked/);
  expect(html).toMatch(/type="radio"[^>]*checked/);
  expect(html).toMatch(/<button[^>]*disabled[^>]*>削除/);
});

test("エラー・読み込み中", () => {
  expect(render({ status: "error", error: "MUSCAT が応答しません" })).toContain("応答しません");
  expect(render()).toContain("読み込み中");
});
