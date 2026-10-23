import { expect, test } from "bun:test";
import { createCore } from "./core";
import { getInfoPage } from "./info";
import type { Fetch } from "./recover";
import { now } from "./testClock";

const menu = `<form id="menuForm" action="/m"><input name="rx-token" value="t"></form>`;
const func = (code: string) =>
  `<div id="mainWrapTop">[${code}]</div><form id="funcForm" action="/f" method="post"><input name="rx-token" value="t">
  <h3 class="ui-accordion-header">学生基本情報</h3><div class="ui-accordion-content"><table class="ui-panelgrid"><tr><td class="ui-panelgrid-cell">氏名</td><td class="ui-panelgrid-cell">テスト</td></tr></table></div></form>`;
const pageDoc = (inner: string) => new DOMParser().parseFromString(menu + inner, "text/html");
const ids = { 学籍情報照会: "A|1" };

function fake(respond: () => string) {
  const bodies: string[] = [];
  const f: Fetch = async (_u, init) => {
    bodies.push(String(init?.body));
    return new Response(respond());
  };
  return { f, bodies };
}

test("前の画面から来たとき: メニュー POST 1 回", async () => {
  const { f, bodies } = fake(() => menu + func("Bsb004"));
  const core = createCore({ fetch: f, doc: pageDoc("<p>x</p>"), ids, now });
  const p = await getInfoPage(core, "学籍情報照会", "Bsb004");
  expect(bodies.length).toBe(1);
  expect(p.sections[0]!.title).toBe("学生基本情報");
});

test("すでにその画面のとき: 通信 0 回", async () => {
  const { f, bodies } = fake(() => "");
  const core = createCore({ fetch: f, doc: pageDoc(func("Bsb004")), ids, now });
  await getInfoPage(core, "学籍情報照会", "Bsb004");
  expect(bodies.length).toBe(0);
});

test("別の info 画面(コードが違う)にいるとき: メニュー POST 1 回", async () => {
  const { f, bodies } = fake(() => menu + func("Bsb004"));
  const core = createCore({ fetch: f, doc: pageDoc(func("Xyz999")), ids, now });
  await getInfoPage(core, "学籍情報照会", "Bsb004");
  expect(bodies.length).toBe(1);
});
