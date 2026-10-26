import { expect, test } from "bun:test";
import { filterSteps, getGrades } from "./grades";
import { createCore } from "./core";
import type { Fetch } from "./recover";
import { now } from "./testClock";

const menu = `<form id="menuForm" action="/m"><input name="rx-token" value="t"></form>`;
const box = (n: string, on: boolean) => `<input type="checkbox" name="funcForm:${n}DispFlg_input"${on ? " checked" : ""}>`;
const func = (on: string[] = ["fail", "rishu", "muhaito", "furikae"]) =>
  `<form id="funcForm" action="/f" method="post"><input name="rx-token" value="t">
  ${["fail", "rishu", "muhaito", "furikae"].map((n) => box(n, on.includes(n))).join("")}
  <table><tr><th>印</th><th>科目</th><th>単位数</th><th>評価</th></tr></table></form>`;
const pageDoc = (inner: string) => new DOMParser().parseFromString(menu + inner, "text/html");
const ids = { 成績照会: "G|1" };
const all = { fail: true, inProgress: true, noCredit: true, transfer: true };

function fake(respond: () => string) {
  const bodies: string[] = [];
  const f: Fetch = async (_u, init) => {
    bodies.push(String(init?.body));
    return new Response(respond());
  };
  return { f, bodies };
}

test("前の画面から来たとき: メニュー POST 1 回", async () => {
  const { f, bodies } = fake(() => menu + func());
  const core = createCore({ fetch: f, doc: pageDoc("<p>x</p>"), ids, now });
  const g = await getGrades(core);
  expect(bodies.length).toBe(1);
  expect(g.filter).toEqual(all);
});

test("filter 省略で成績照会の画面なら通信 0 回", async () => {
  const { f, bodies } = fake(() => "");
  const core = createCore({ fetch: f, doc: pageDoc(func()), ids, now });
  await getGrades(core);
  expect(bodies.length).toBe(0);
});

test("filter 付きで成績照会の画面でなければ、何も送らずにエラー(黙って無視しない)", async () => {
  const { f, bodies } = fake(() => menu + func());
  const core = createCore({ fetch: f, doc: pageDoc("<p>x</p>"), ids, now });
  await expect(getGrades(core, all)).rejects.toThrow("成績照会の画面ではない");
  expect(bodies.length).toBe(0);
});

const chk = (n: string, on: boolean) =>
  `<div class="ui-chkbox"><input type="checkbox" name="funcForm:${n}DispFlg_input"${on ? " checked" : ""}><div class="ui-chkbox-box"></div></div>`;
const filterPage = (on: boolean) =>
  new DOMParser().parseFromString(`<form id="funcForm">${["fail", "rishu", "muhaito", "furikae"].map((n) => chk(n, on)).join("")}<button id="funcForm:search">表示</button></form>`, "text/html");

test("変わるチェックだけ押してから「表示」(ajax)。同じなら「表示」だけ", () => {
  const steps = filterSteps(filterPage(true), { ...all, fail: false })!;
  expect(steps.map((s) => s.kind === "click" && s.ajax)).toEqual([false, true]);
  expect(filterSteps(filterPage(true), all)).toHaveLength(1);
});

test("部品が無ければ null", () => {
  expect(filterSteps(new DOMParser().parseFromString("<p>x</p>", "text/html"), all)).toBeNull();
});
