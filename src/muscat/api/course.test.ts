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
  <input class="ui-inputtext" name="funcForm:memo" value="${memo}"><button id="funcForm:save" type="button" onclick="PrimeFaces.ab({s:&quot;funcForm:save&quot;,f:&quot;funcForm&quot;,p:&quot;funcForm:save funcForm:memo&quot;,rv:true});return false;">登録</button></li></ul></div></form>`;
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
  // 登録ボタンを押したときと同じ ab(記録した形式: resetvalues → execute → `<s>=<s>` → フォームの項目)
  expect([...body.keys()].slice(0, 5)).toEqual(["jakarta.faces.partial.ajax", "jakarta.faces.source", "primefaces.resetvalues", "jakarta.faces.partial.execute", "funcForm:save"]);
  expect(body.get("jakarta.faces.partial.execute")).toBe("funcForm:save funcForm:memo");
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

// シラバス照会ボタンつきのホーム。小窓は押したあとの応答で開く
const syllabusHome = homeDoc("new").replace(
  `<input class="ui-inputtext"`,
  `<div class="lessonBtnArea"><button id="funcForm:syl0" type="button" onclick="PrimeFaces.ab({s:&quot;funcForm:syl0&quot;,f:&quot;funcForm&quot;,p:&quot;funcForm:syl0&quot;});return false;">シラバス照会</button></div><input class="ui-inputtext"`,
);
const dialogReply = `<partial-response><changes><update id="funcForm:dlg"><![CDATA[<div id="pkx02301:dialog" aria-hidden="false"><span class="ui-dialog-title">シラバス照会</span>
<div class="rowStyle rowMargin"><div class="ui-widget-header">授業コード・授業科目</div><div class="ui-widget-content"><div>0010010101 合成演習</div></div></div></div>
<button id="funcForm:closeB" type="button" onclick="PrimeFaces.ab({s:&quot;funcForm:closeB&quot;,f:&quot;funcForm&quot;});return false;"></button>
<script>PrimeFaces.cw("CommandButton","pkx02301-closeBtn",{id:"funcForm:closeB"});</script>]]></update></changes></partial-response>`;

function sylServer() {
  const sources: (string | null)[] = [];
  const f: Fetch = async (url, init) => {
    const body = String(init?.body ?? "");
    url = new URL(url, "http://x").pathname;
    if (url.includes("ShibbolethAuthServlet")) return new Response(relay);
    if (url === "/login") return new Response(menu + syllabusHome.replace(`<form id="funcForm"`, `<div id="funcForm:dlg"></div><form id="funcForm"`));
    if (body.includes("partial.ajax")) {
      const s = new URLSearchParams(body).get("jakarta.faces.source");
      sources.push(s);
      return new Response(s === "funcForm:syl0" ? dialogReply : "<partial-response><changes></changes></partial-response>");
    }
    return new Response(menu + attendance);
  };
  return { f, sources };
}

test("getCourseSyllabus: シラバス照会ボタン → 詳細を読む → closeBtn の順に送る", async () => {
  const { f, sources } = sylServer();
  const c = createMuscatClient({ fetch: f, doc: toDoc("<p>x</p>"), ids, now });
  const d = await c.syllabus.ofCourse({ title: "合成演習" });
  expect([d.code, d.title]).toEqual(["0010010101", "合成演習"]);
  expect(sources).toEqual(["funcForm:syl0", "funcForm:closeB"]);
});

test("getCourseSyllabus: 開いた詳細の授業コードが違えば(同名の別クラス)、閉じてから「履修授業にありません」(検索で開く予備へ)", async () => {
  const { f, sources } = sylServer();
  const c = createMuscatClient({ fetch: f, doc: toDoc("<p>x</p>"), ids, now });
  await expect(c.syllabus.ofCourse({ title: "合成演習", code: "9999999999" })).rejects.toThrow("履修授業にありません");
  expect(sources).toEqual(["funcForm:syl0", "funcForm:closeB"]);
  expect((await c.syllabus.ofCourse({ title: "合成演習", code: "0010010101" })).code).toBe("0010010101");
});

test("getCourseSyllabus: 履修授業に無ければ ParseError で何も送らない", async () => {
  const { f, sources } = sylServer();
  const c = createMuscatClient({ fetch: f, doc: toDoc("<p>x</p>"), ids, now });
  await expect(c.syllabus.ofCourse({ title: "無い授業" })).rejects.toThrow("履修授業にありません");
  expect(sources).toEqual([]);
});
