import { expect, test } from "bun:test";
import { createMuscatClient } from "./client";
import type { Fetch } from "./recover";
import { now } from "./testClock";

const menu = `<form id="menuForm" action="/m"><input type="hidden" name="rx-token" value="t"></form>`;
const attendance = `<form id="funcForm" action="/f" method="post"><select name="funcForm:kaikoNendoGakki_input"><option value="2026|03" selected>2026年度 3学期</option></select>
  <table><tr><th>曜日時限</th><th>授業科目</th><th>出席率</th><th>1回</th></tr>
  <tr><td><span>火2</span></td><td>5300100033<span class="ml-2">合成 演習</span>（教員A）</td><td>50.0％</td>
  <td class="colSizeFixed"><span class="absence jugyoList"><span class="syuketsuKbnMark">欠</span></span><p class="jugyoDate">10/06</p></td></tr></table></form>`;
const homeDoc = (token: string, memo = "持ち物") =>
  `<div id="portalCont"></div><form id="funcForm" action="/f" method="post"><input type="hidden" name="jakarta.faces.ViewState" value="${token}">
  <div id="portalLessonList"><ul><li class="ui-dataview-row"><p class="lessonTitle">合成演習</p><span class="x"></span>
  <div class="lessonHead"><span>火 2</span></div><div class="lessonDetail"><a class="ui-commandlink">教員A</a><div>101</div></div>
  <input class="ui-inputtext" name="funcForm:memo" value="${memo}"><button id="funcForm:save">登録</button></li></ul></div></form>`;
const relay = `<form id="loginForm" action="/login"></form>`;
const toDoc = (html: string) => new DOMParser().parseFromString(html, "text/html");
const ids = { 出席確認: "A|1" };

function server(partial?: string) {
  const calls: { url: string; body: string }[] = [];
  const f: Fetch = async (url, init) => {
    const body = String(init?.body ?? "");
    url = new URL(url, "http://x").pathname; // 送り先は location 基準の絶対 URL になる
    calls.push({ url, body });
    if (url.includes("ShibbolethAuthServlet")) return new Response(relay);
    if (url === "/login") return new Response(menu + homeDoc("new"));
    if (body.includes("partial.ajax")) return new Response(partial ?? "<partial-response><changes></changes></partial-response>");
    return new Response(menu + attendance); // メニュー POST
  };
  return { f, calls };
}

test("getCourse: 出席 → ホームの順に取り込み、生きたページには触らない", async () => {
  const { f, calls } = server();
  const live = toDoc(menu + homeDoc("old"));
  const c = createMuscatClient({ fetch: f, doc: live, ids, now });
  const course = await c.getCourse({ title: "合成演習", code: "9999999999" });
  // コードが合わなくても、空白を詰めた科目名で出席に当たる
  expect(course.attendance?.code).toBe("5300100033");
  expect(course).toMatchObject({ title: "合成演習", code: "5300100033", teachers: ["教員A"], room: "101", memo: "持ち物", slots: [{ weekday: "火", period: 2 }] });
  expect(calls.map((x) => x.url)).toEqual(["/m", "/uprx/ShibbolethAuthServlet", "/login"]);
  expect(live.querySelector<HTMLInputElement>('[name="jakarta.faces.ViewState"]')!.value).toBe("old");
});

test("getCourse: 出席が無ければ null", async () => {
  const { f } = server();
  const live = toDoc(menu + `<form id="funcForm"><input type="hidden" name="jakarta.faces.ViewState" value="old"></form>`);
  const c = createMuscatClient({ fetch: f, doc: live, ids, now });
  const course = await c.getCourse({ title: "別の授業" });
  expect(course).toMatchObject({ attendance: null, memo: null, slots: [] });
  expect(live.querySelector<HTMLInputElement>("#funcForm input")!.value).toBe("old");
});

test("saveMemo: 登録ボタンの部分更新でメモを送り、複製のメモ欄を直す(生きたページは触らない)", async () => {
  const { f, calls } = server();
  const live = toDoc(menu + homeDoc("old"));
  const c = createMuscatClient({ fetch: f, doc: live, ids, now });
  await c.saveMemo("合成演習", "新しいメモ");
  expect(calls).toHaveLength(1);
  const body = new URLSearchParams(calls[0]!.body);
  expect(body.get("jakarta.faces.source")).toBe("funcForm:save");
  expect(body.get("funcForm:memo")).toBe("新しいメモ");
  expect(await c.readLive((d) => d.querySelector<HTMLInputElement>('[name="funcForm:memo"]')!.value)).toBe("新しいメモ");
  expect(live.querySelector<HTMLInputElement>('[name="funcForm:memo"]')!.value).toBe("持ち物");
});

test("saveMemo: ホームでなければ取り込んでから送る。授業が無ければエラー", async () => {
  const { f, calls } = server();
  const c = createMuscatClient({ fetch: f, doc: toDoc("<p>x</p>"), ids, now });
  await c.saveMemo("合成演習", "a");
  expect(calls.map((x) => x.url)).toEqual(["/uprx/ShibbolethAuthServlet", "/login", "/f"]);
  await expect(c.saveMemo("無い授業", "a")).rejects.toThrow();
});
