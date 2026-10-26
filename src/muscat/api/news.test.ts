import { expect, test } from "bun:test";
import { createMuscatClient } from "./client";
import type { Fetch } from "./recover";
import { now } from "./testClock";

const NAMES = ["グループ", "全表示", "授業", "時間割変更", "既読", "未読", "新着", "重要", "申込", "フラグつき"];
const ab = (s: string) => `PrimeFaces.ab({s:&quot;${s}&quot;,f:&quot;funcForm&quot;,u:&quot;funcForm&quot;});return false;`;
const row = (title: string, read: string) =>
  `<div class="alignRight"><dl class="textOf"><span class="keijiCategory">授業</span><a class="ui-commandlink" href="#">${title}</a> [テスト部署] 2026/10/12</dl>
  <span class="inlineBlock"><div class="ui-selectbooleanbutton">フラグをつける</div><div class="ui-selectbooleanbutton">${read}</div></span></div>`;
const head = (title: string) =>
  `<h3 class="ui-accordion-header"><table class="tabWidth"><tr><td class="tabTitle">${title}</td><td class="tabTitleSetumei"></td><td class="tabTitleKensu"></td></tr></table></h3>`;
const group = (title: string, id: string, read: string) =>
  `${head(title)}<div class="ui-accordion-content"><div class="squeezeArea"><span class="floatRight"><div class="alignRight"><button id="${id}" type="button" onclick="${ab(id)}">更新</button></div></span></div>${row(`${title}の掲示`, read)}</div>`;

const html = `<form id="menuForm" action="/m"><input name="rx-token" value="t"></form><div id="funcContent"><form id="funcForm" action="/f" method="post">
  <input type="hidden" name="funcForm_SUBMIT" value="1"><input type="hidden" name="jakarta.faces.ViewState" value="vs1">
  <input name="funcForm:keyword" value=""><input name="funcForm:jugyoKamoku" value="">
  <button id="funcForm:search" type="button" onclick="${ab("funcForm:search")}">検索</button>
  <div id="funcForm:tabArea" class="ui-tabs"><ul class="ui-tabs-nav">${NAMES.map((n, i) => `<li class="${i === 0 ? "ui-tabs-selected" : ""}"><a href="#t${i}">${n}</a></li>`).join("")}</ul>
  <div class="ui-tabs-panels">${NAMES.map((_, i) => `<div class="ui-tabs-panel">${i === 0 ? `<div class="ui-accordion">${group("未読あり", "funcForm:u1", "既読にする")}${group("未読なし", "funcForm:u2", "未読にする")}</div>` : ""}</div>`).join("")}</div></div>
  <div class="ui-confirm-dialog"><button class="ui-confirmdialog-yes" type="button">はい</button></div>
</form></div>`;

const xml = `<partial-response><changes><update id="jakarta.faces.ViewState"><![CDATA[vs2]]></update></changes></partial-response>`;
function setup() {
  const bodies: URLSearchParams[] = [];
  const f: Fetch = async (_url, init) => {
    bodies.push(new URLSearchParams(String(init?.body ?? "")));
    return new Response(xml, { status: 200 });
  };
  const doc = new DOMParser().parseFromString(html, "text/html");
  return { c: createMuscatClient({ fetch: f, doc, ids: {}, now }), bodies };
}

test("news.search: 検索欄を入れて検索を 1 回だけ送る", async () => {
  const { c, bodies } = setup();
  await c.news.search({ keyword: "履修", course: "" });
  expect(bodies).toHaveLength(1);
  expect(bodies[0]!.get("jakarta.faces.source")).toBe("funcForm:search");
  expect(bodies[0]!.get("funcForm:keyword")).toBe("履修");
});

test("news.markAllRead: 未読のあるグループの「更新」を送る(確認の OK は通信なし)", async () => {
  const { c, bodies } = setup();
  await c.news.markAllRead("未読あり");
  expect(bodies).toHaveLength(1);
  expect(bodies[0]!.get("jakarta.faces.source")).toBe("funcForm:u1");
});

test("news.markAllRead: 未読の無いグループ・無いグループは reject し、何も送らない", async () => {
  const { c, bodies } = setup();
  await expect(c.news.markAllRead("未読なし")).rejects.toThrow();
  await expect(c.news.markAllRead("存在しない")).rejects.toThrow();
  expect(bodies).toHaveLength(0);
});

test("press: ref の部品の通信を 1 回送る", async () => {
  const { c, bodies } = setup();
  const p = await c.news.read();
  await c.press(p.groups![1]!.updateRef);
  expect(bodies).toHaveLength(1);
  expect(bodies[0]!.get("jakarta.faces.source")).toBe("funcForm:u2");
});
