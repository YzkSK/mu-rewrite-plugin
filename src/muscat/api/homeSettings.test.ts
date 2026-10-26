import { expect, test } from "bun:test";
import { createMuscatClient } from "./client";
import { daysFrom } from "./home";
import type { Fetch } from "./recover";
import { now } from "./testClock";

const ab = (s: string) => `PrimeFaces.ab({s:&quot;${s}&quot;,f:&quot;funcForm&quot;,u:&quot;funcForm&quot;});return false;`;
const xml = `<partial-response><changes><update id="jakarta.faces.ViewState"><![CDATA[vs2]]></update></changes></partial-response>`;

function setup(body: string, extra = "") {
  const bodies: URLSearchParams[] = [];
  const f: Fetch = async (_url, init) => {
    bodies.push(new URLSearchParams(String(init?.body ?? "")));
    return new Response(xml, { status: 200 });
  };
  const html = `${extra}<form id="menuForm" action="/m"><input name="rx-token" value="t"></form><div id="funcContent"><form id="funcForm" action="/f" method="post">
    <input type="hidden" name="funcForm_SUBMIT" value="1"><input type="hidden" name="jakarta.faces.ViewState" value="vs1">${body}</form></div>`;
  const c = createMuscatClient({ fetch: f, doc: new DOMParser().parseFromString(html, "text/html"), ids: {}, now });
  return { c, bodies, sources: () => bodies.map((b) => b.get("jakarta.faces.source")) };
}

test("daysFrom: 画面の日付が今日から何日先か。月をまたいでも数える。読めなければ 0", () => {
  const n = new Date(2026, 9, 25, 23, 0);
  expect(daysFrom("2026/10/27(火)", n)).toBe(2);
  expect(daysFrom("2026/10/25(日)", n)).toBe(0);
  expect(daysFrom("2026/10/23(金)", n)).toBe(-2);
  expect(daysFrom("2026/11/01(日)", n)).toBe(7);
  expect(daysFrom("?", n)).toBe(0);
});

// ---- ホーム ----
const btn = (id: string, label: string) => `<button id="funcForm:${id}" type="button" onclick="${ab(`funcForm:${id}`)}">${label}</button>`;
const homeNav = `<div id="portalCont"><div class="ui-tabs-panel"><p><span class="dateDisp">2026/10/27(火)</span></p><p class="dateBtnArea">
  ${btn("pw", "前週")}${btn("pd", "前日")}${btn("td", "今日")}${btn("nd", "翌日")}${btn("nw", "翌週")}</p>
  <h3><span class="portalTitle">時間別</span></h3><div class="ui-dataview"><div class="ui-dataview-content">予定はありません。</div></div></div></div>`;
const NOW = new Date(2026, 9, 25, 12, 0);

test("home.showDay: 2 日後なら「今日」→「翌日」×2", async () => {
  const { c, sources } = setup(homeNav);
  await c.home.showDay("2026/10/27(火)", NOW);
  expect(sources()).toEqual(["funcForm:td", "funcForm:nd", "funcForm:nd"]);
});

test("home.showDay: 前の日なら「前日」、同じ日なら「今日」だけ", async () => {
  const a = setup(homeNav);
  await a.c.home.showDay("2026/10/24(土)", NOW);
  expect(a.sources()).toEqual(["funcForm:td", "funcForm:pd"]);
  const b = setup(homeNav);
  await b.c.home.showDay("2026/10/25(日)", NOW);
  expect(b.sources()).toEqual(["funcForm:td"]);
});

test("home.showDay: 「今日」が無ければ reject し、何も送らない", async () => {
  const { c, bodies } = setup(`<div id="portalCont"></div>`);
  await expect(c.home.showDay("2026/10/27(火)", NOW)).rejects.toThrow();
  expect(bodies).toHaveLength(0);
});

// ---- 個人設定 ----
const box = (id: string, on = false) =>
  `<div class="ui-chkbox"><div class="ui-helper-hidden-accessible"><input id="${id}" type="checkbox" ${on ? "checked" : ""}></div><div class="ui-chkbox-box ${on ? "ui-state-active" : ""}"></div></div>`;
const radio = (i: number, label: string, on = false) =>
  `<div><div class="ui-radiobutton"><input id="r:${i}" type="radio" name="r" ${on ? "checked" : ""}><div class="ui-radiobutton-box"></div></div><label for="r:${i}">${label}</label></div>`;
const save = (id: string) => `<button id="funcForm:${id}" type="button" data-pfconfirmcommand="${ab(`funcForm:${id}`)}" onclick="PrimeFaces.confirm({source:'funcForm:${id}',message:'保存します。よろしいですか？'});return false;"><span>保存</span></button>`;
const panel = (title: string, body: string) => `<div class="ui-accordion-header">${title}</div><div class="ui-accordion-content">${body}</div>`;
const time = (i: number, t: string, on = false) => `<tr><td>${box(`tm${i}`, on).replace('type="checkbox"', 'type="checkbox" name="funcForm:mailSendTimes"')}<label>${t}</label></td></tr>`;
const mail = `
  ${panel("メールアドレス設定", `
    <input id="funcForm:inputMailAddr" name="funcForm:inputMailAddr" value="">
    ${radio(1, "連絡用メールアドレス", true)}${radio(2, "任意メールアドレス")}
    ${btn("add", "追加")}
    <div id="funcForm:mailAddrList" class="ui-datatable"><table>
      <thead><tr><th class="ui-selection-column"></th><th>メールアドレス</th></tr></thead>
      <tbody class="ui-datatable-data"><tr data-rk="1"><td class="ui-selection-column">${box("sel1", true)}</td><td>a@example.com</td></tr><tr data-rk="2"><td class="ui-selection-column">${box("sel2")}</td><td>b@example.com</td></tr></tbody>
    </table></div>
    ${btn("del", "選択した行を削除")}${save("saveAddr")}`)}
  ${panel("配信時刻設定", `<table class="ui-selectmanycheckbox">${time(0, "00:00")}${time(1, "06:00", true)}${time(2, "08:00")}</table>${save("saveTimes")}`)}
  ${panel("配信停止設定", `<div class="ui-datatable"><table><thead><tr><th>用途</th></tr></thead><tbody class="ui-datatable-data"><tr class="ui-datatable-empty-message"><td>対象データがありません。</td></tr></tbody></table></div>${save("saveStop")}`)}`;
const settingsPage = (body: string) =>
  `<div class="ui-tabs" id="funcForm:tabArea"><ul class="ui-tabs-nav"><li class="ui-state-active"><a href="#funcForm:tabArea:j_id_0">メール設定</a></li></ul><div class="ui-tabs-panels"><div class="ui-tabs-panel" id="funcForm:tabArea:j_id_0">${body}</div></div></div>`;
const confirmOk = `<div class="ui-confirm-dialog"><button class="ui-confirmdialog-yes"><span>OK</span></button></div>`;
const mailSetup = () => setup(settingsPage(mail), confirmOk);

test("settings.save: 違うチェックだけ押してから保存(保存は確認つきの通信、確認の OK は通信なし)", async () => {
  const { c, sources } = mailSetup();
  const p = await c.settings.read();
  const [t0, t1, t2] = p.mail!.times.options;
  // 00:00 を付け、06:00 は付いたまま(押さない)、08:00 は元のまま(押さない)
  await c.settings.save({ section: "times", checks: { [t0!.ref]: true, [t1!.ref]: true, [t2!.ref]: false } });
  expect(sources()).toEqual(["funcForm:saveTimes"]);
  expect(await c.readLive((d) => (d.getElementById("tm0") as HTMLInputElement).checked)).toBe(true);
});

test("settings.save: 保存だけ(address)でも節の保存を 1 回送る", async () => {
  const { c, sources } = mailSetup();
  await c.settings.save({ section: "address" });
  expect(sources()).toEqual(["funcForm:saveAddr"]);
});

test("settings.save: 確認の OK が無ければ reject し、何も送らない", async () => {
  const { c, bodies } = setup(settingsPage(mail));
  await expect(c.settings.save({ section: "times", checks: {} })).rejects.toThrow();
  expect(bodies).toHaveLength(0);
});

test("settings.save: 節が無ければ reject し、何も送らない", async () => {
  const { c, bodies } = mailSetup();
  await expect(c.settings.save({ section: "portal", pick: "x" })).rejects.toThrow();
  expect(bodies).toHaveLength(0);
});

test("settings.addAddress: 入力 → 種類(今と違うときだけ押す) → 追加", async () => {
  const { c, sources, bodies } = mailSetup();
  const p = await c.settings.read();
  await c.settings.addAddress("x@example.com", p.mail!.address.kinds[0]!.ref); // 選択中と同じ種類は押さない
  expect(sources()).toEqual(["funcForm:add"]);
  expect(bodies[0]!.get("funcForm:inputMailAddr")).toBe("x@example.com");
});

test("settings.deleteAddresses: 違う行の枠だけ押してから削除", async () => {
  const { c, sources, look } = (() => {
    const s = mailSetup();
    return { ...s, look: <T,>(fn: (d: Document) => T) => s.c.readLive(fn) };
  })();
  const p = await c.settings.read();
  const [r1, r2] = p.mail!.address.table.rows;
  await c.settings.deleteAddresses({ [r1!.select.ref]: false, [r2!.select.ref]: true });
  expect(sources()).toEqual(["funcForm:del"]);
  expect(await look((d) => [d.getElementById("sel1"), d.getElementById("sel2")].map((e) => (e as HTMLInputElement).checked))).toEqual([false, true]);
});

const favorite = `<select id="funcForm:menu_input" name="funcForm:menu_input"><option value="" selected>選択してください</option><option value="m1">時間割</option></select>
  ${btn("favAdd", "追加")}
  <div id="funcForm:favoriteMenuList" class="ui-datatable"><table><thead><tr><th class="ui-selection-column"></th><th>機能</th></tr></thead>
  <tbody class="ui-datatable-data"><tr class="ui-datatable-empty-message"><td colspan="2">対象データがありません。</td></tr></tbody></table></div>
  ${btn("favReset", "元に戻す")}${save("saveFav")}`;
const favSetup = () => setup(settingsPage(favorite), confirmOk);

test("settings.addFavorite: 機能を選んで追加を 1 回送る", async () => {
  const { c, sources, bodies } = favSetup();
  await c.settings.addFavorite("m1");
  expect(sources()).toEqual(["funcForm:favAdd"]);
  expect(bodies[0]!.get("funcForm:menu_input")).toBe("m1");
});

test("settings.resetFavorite: 「元に戻す」を 1 回送る", async () => {
  const { c, sources } = favSetup();
  await c.settings.resetFavorite();
  expect(sources()).toEqual(["funcForm:favReset"]);
});
