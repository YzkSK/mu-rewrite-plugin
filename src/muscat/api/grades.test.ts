import { expect, test } from "bun:test";
import { getGrades } from "./grades";
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

test("filter 省略・同じなら通信 0 回", async () => {
  const { f, bodies } = fake(() => "");
  const core = createCore({ fetch: f, doc: pageDoc(func()), ids, now });
  await getGrades(core);
  await getGrades(core, all);
  expect(bodies.length).toBe(0);
});

test("filter を変えると部分更新 1 回。外したチェックは送らず、入れたチェックは on", async () => {
  const xml = `<partial-response><changes><update id="funcForm"><![CDATA[${func(["fail", "furikae"])}]]></update></changes></partial-response>`;
  const { f, bodies } = fake(() => xml);
  const core = createCore({ fetch: f, doc: pageDoc(func(["rishu", "furikae"])), ids, now });
  const g = await getGrades(core, { fail: true, inProgress: false, noCredit: false, transfer: true });
  expect(bodies.length).toBe(1);
  const b = new URLSearchParams(bodies[0]);
  expect(b.get("jakarta.faces.source")).toBe("funcForm:search");
  expect(b.get("jakarta.faces.partial.render")).toBe("funcForm");
  expect(b.get("funcForm:failDispFlg_input")).toBe("on");
  expect(b.get("funcForm:furikaeDispFlg_input")).toBe("on");
  expect(b.has("funcForm:rishuDispFlg_input")).toBe(false);
  expect(b.has("funcForm:muhaitoDispFlg_input")).toBe(false);
  expect(g.filter).toEqual({ fail: true, inProgress: false, noCredit: false, transfer: true });
});
