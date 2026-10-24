import { expect, test } from "bun:test";
import { filterSteps } from "./useGrades";

const box = (n: string, on: boolean) =>
  `<div class="ui-chkbox"><input type="checkbox" name="funcForm:${n}DispFlg_input"${on ? " checked" : ""}><div class="ui-chkbox-box"></div></div>`;
const page = (on: boolean) =>
  new DOMParser().parseFromString(`<form id="funcForm">${["fail", "rishu", "muhaito", "furikae"].map((n) => box(n, on)).join("")}<button id="funcForm:search">表示</button></form>`, "text/html");
const all = { fail: true, inProgress: true, noCredit: true, transfer: true };

test("変わるチェックだけ押してから「表示」(ajax)。同じなら「表示」だけ", () => {
  const steps = filterSteps(page(true), { ...all, fail: false })!;
  expect(steps.map((s) => s.kind === "click" && s.ajax)).toEqual([false, true]);
  expect(filterSteps(page(true), all)).toHaveLength(1);
});

test("部品が無ければ null", () => {
  expect(filterSteps(new DOMParser().parseFromString("<p>x</p>", "text/html"), all)).toBeNull();
});
