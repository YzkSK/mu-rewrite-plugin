import { expect, test } from "bun:test";
import { exportFile } from "./exportFile";

const page = (html: string) => new DOMParser().parseFromString(`<form id="funcForm">${html}</form>`, "text/html");

test("文字が PDF のボタンを押して true、「非表示」ボタンは押さない", () => {
  const doc = page(`<button id="funcForm:pdfButton" type="button">非表示</button><button id="pdf" type="button">PDF</button>`);
  const clicked: string[] = [];
  for (const b of doc.querySelectorAll("button")) b.addEventListener("click", () => clicked.push(b.id));
  expect(exportFile(doc, "PDF")).toBe(true);
  expect(clicked).toEqual(["pdf"]);
});

test("ボタンが無ければ false", () => {
  expect(exportFile(page(`<button id="funcForm:excelButton" type="button">非表示</button>`), "Excel")).toBe(false);
});
