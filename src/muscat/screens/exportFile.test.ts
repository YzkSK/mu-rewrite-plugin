import { afterEach, expect, spyOn, test } from "bun:test";
import { exportRequestOf, findExportButton } from "../api/exportForm";
import { postToNewTab } from "./exportFile";

const page = (html: string) =>
  new DOMParser().parseFromString(`<form id="funcForm" action="/f" method="post"><input type="hidden" name="jakarta.faces.ViewState" value="vs1">${html}</form>`, "text/html");

afterEach(() => document.body.replaceChildren());

test("文字が PDF のボタンを探す。「非表示」ボタンは別物", () => {
  const doc = page(`<button id="funcForm:pdfButton" type="button">非表示</button><button id="funcForm:pdf" name="funcForm:pdf" type="submit">PDF</button>`);
  expect(findExportButton(doc, "PDF")?.id).toBe("funcForm:pdf");
  expect(findExportButton(doc, "Excel")).toBeUndefined();
  expect(exportRequestOf(doc, "Excel")).toBeNull();
});

test("出力の POST: フォームの全項目(ViewState 含む)+ ボタンの名前=値", () => {
  const doc = page(`<input name="a" value="1"><button id="funcForm:pdf" name="funcForm:pdf" type="submit">PDF</button>`);
  const r = exportRequestOf(doc, "PDF")!;
  expect(r.url.endsWith("/f")).toBe(true);
  expect(r.fields).toEqual([["jakarta.faces.ViewState", "vs1"], ["a", "1"], ["funcForm:pdf", ""]]);
});

test("postToNewTab: 新しいタブへ向けた隠しフォームで送る(送ったあとは残さない)", () => {
  const sent: unknown[] = [];
  const spy = spyOn(HTMLFormElement.prototype, "submit").mockImplementation(function (this: HTMLFormElement) {
    sent.push({ action: this.action, target: this.target, fields: [...new FormData(this)].map(([k, v]) => `${k}=${v}`) });
  });
  postToNewTab({ url: "https://x.test/f", fields: [["a", "1"], ["b", ""]] });
  spy.mockRestore();
  expect(sent).toEqual([{ action: "https://x.test/f", target: "_blank", fields: ["a=1", "b="] }]);
  expect(document.querySelector("form")).toBeNull();
});
