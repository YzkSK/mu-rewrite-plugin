import { expect, test } from "bun:test";
import { ParseError } from "./errors";
import { dialogMessages, roomBooking, roomInfo, roomMore, roomSubmit } from "./roomFetch";

const RC = "funcForm:j_id_rc";
const SUB = "funcForm:j_id_sub";
const head = `<tr><th>教室</th><th>収容</th><th>8:00</th><th></th><th>9:00</th><th></th></tr>`;
const html = `<form id="funcForm" action="/t" method="post"><input name="jakarta.faces.ViewState" value="vs1"><input name="rx-token" value="t">
<script id="${RC}">PrimeFaces.ab({s:"${RC}"});function subTableRun(){}</script>
<div id="funcForm:dataList">元</div>
<div id="funcForm:yoyakuArea"><table><thead>${head}</thead><tbody class="ui-datatable-data"></tbody></table></div>
<div id="${SUB}"><div class="dispNone"><table><tbody id="subTbody"></tbody></table></div></div></form>`;
const makeDoc = () => new DOMParser().parseFromString(html, "text/html");
const tr = (name: string, bar = "") => `<tr><td><span class="kstNameArea">${name}</span></td><td>40</td><td>${bar}</td><td></td><td></td><td></td></tr>`;
const reply = (text: string) => {
  const calls: { url: string; body: URLSearchParams }[] = [];
  const f = (async (url: string, init: RequestInit) => {
    calls.push({ url, body: init.body as URLSearchParams });
    return new Response(text, { status: 200 });
  }) as unknown as typeof window.fetch;
  return { f, calls };
};
const vs = `<update id="j_id1:jakarta.faces.ViewState:0"><![CDATA[vs2]]></update>`;
const xml = (rows: string) => `<partial-response><changes><update id="${SUB}"><![CDATA[<div id="${SUB}"><div class="dispNone"><table><tbody id="subTbody">${rows}</tbody></table></div></div>]]></update>${vs}</changes></partial-response>`;

const seq = (...texts: string[]) => {
  const sources: string[] = [];
  const f = (async (_url: string, init: RequestInit) => {
    sources.push((init.body as URLSearchParams).get("jakarta.faces.source") ?? "");
    return new Response(texts.shift() ?? "", { status: 200 });
  }) as unknown as typeof window.fetch;
  return { f, sources };
};
const NAME = "武蔵野６５０２（演習室）";
const infoRow = (name: string, id: string) => `<tr><td><span class="kstNameArea">${name}<button id="${id}" class="roomInfoBtn"></button></span></td><td></td><td></td><td></td><td></td><td></td></tr>`;
// 続きの行の ⓘ は id が無く、何日目・何番目で指す
const subRow = (name: string, k: number, v: number) => `<tr><td><span class="kstNameArea">${name}<button class="roomInfoBtn" onclick="return kstOverlayShowPreProc(${k},${v});"></button></span></td><td></td><td></td><td></td><td></td><td></td></tr>`;
const overlay = `<partial-response><changes><update id="funcForm:kstOverlay"><![CDATA[<div><span>${NAME}</span>武蔵野６号館5F [教室グループ] 武蔵野教室 [収容人数] 平常：31名 [キーワード] ホワイトボード</div>]]></update>${vs}</changes></partial-response>`;
const empty = `<partial-response><changes>${vs}</changes></partial-response>`;
const withCmd = () => {
  const doc = makeDoc();
  doc.getElementById("funcForm")!.insertAdjacentHTML("beforeend", `<script id="funcForm:j_id_dh">function x(){kstOverlayShowProc('funcForm:j_id_dh')}</script>`);
  return doc;
};

test("roomInfo: 読み切ったページの先頭 40 行の教室は、その行のボタンの id で取り、見出しごとに分ける", async () => {
  const doc = withCmd();
  doc.querySelector("tbody.ui-datatable-data")!.innerHTML = infoRow(NAME, "funcForm:i:0");
  const { f, sources } = seq(empty, xml(""), overlay);
  await roomSubmit(doc, f, "funcForm:search", "funcForm:search");
  await roomMore(doc, f); // 0 行 = ページを読み切った
  const info = await roomInfo(doc, f, "武蔵野6502(演習室)");
  expect(sources).toEqual(["funcForm:search", RC, "funcForm:i:0"]);
  expect(info.place).toBe("武蔵野6号館5F");
  expect(info.fields).toEqual([{ label: "教室グループ", value: "武蔵野教室" }, { label: "収容人数", value: "平常:31名" }, { label: "キーワード", value: "ホワイトボード" }]);
});

test("roomInfo: 続きの行の教室は、何日目・何番目を付けて元の画面と同じ通信で取る", async () => {
  const doc = withCmd();
  const calls: URLSearchParams[] = [];
  const texts = [empty, xml(subRow(NAME, 2, 7)), xml(""), overlay];
  const f = (async (_u: string, init: RequestInit) => (calls.push(init.body as URLSearchParams), new Response(texts.shift(), { status: 200 }))) as unknown as typeof window.fetch;
  await roomSubmit(doc, f, "funcForm:search", "funcForm:search");
  await roomMore(doc, f);
  await roomMore(doc, f);
  await roomInfo(doc, f, "武蔵野6502(演習室)");
  const b = calls.at(-1)!;
  expect([b.get("jakarta.faces.source"), b.get("keyIndex"), b.get("valIndex"), b.get("jakarta.faces.partial.render")]).toEqual(["funcForm:j_id_dh", "2", "7", "funcForm:kstOverlay"]);
});

test("roomInfo: 覚えていない教室は検索し直し、ページを読み切ってから探し、無ければ「次へ」で次のページへ進む", async () => {
  const doc = withCmd();
  doc.getElementById("funcForm")!.insertAdjacentHTML("beforeend", `<button id="funcForm:forwardBtn"></button>`);
  const { f, sources } = seq(empty, xml(subRow("別の教室", 1, 1)), xml(""), empty, xml(subRow(NAME, 1, 3)), xml(""), overlay);
  await roomInfo(doc, f, "武蔵野6502(演習室)");
  expect(sources).toEqual(["funcForm:search", RC, RC, "funcForm:forwardBtn", RC, RC, "funcForm:j_id_dh"]);
});

test("roomBooking: 続きの行の予約の帯は番号で小窓を頼み、その中の「詳細」と同じ通信で教室予約登録の中身を読む", async () => {
  const doc = withCmd();
  doc.getElementById("funcForm")!.insertAdjacentHTML("beforeend", `<script id="funcForm:j_id_dj">function y(){yoyakOverlayShowProc('funcForm:j_id_dj')}</script>`);
  const title = "00:00～24:00 予約番号：7762 TOEIC試験 堀　美紀";
  const row = `<tr><td><span class="kstNameArea">${NAME}</span></td><td></td><td><a class="timezone zoneResOther" title="${title}" onclick="return yoyakOverlayShowPreProc(1,41,0);">TOEIC</a></td><td></td><td></td><td></td></tr>`;
  const small = `<partial-response><changes><update id="funcForm:yoyakOverlay"><![CDATA[<div><button id="funcForm:j_id_ae">詳細</button></div>]]></update>${vs}</changes></partial-response>`;
  const panel = `<partial-response><changes><update id="ksa00804:dialogPanel"><![CDATA[<table><tr><td>承認状況</td><td>承認済</td></tr><tr><td>予約番号</td><td>7762</td></tr><tr><td>予約者</td><td>堀　美紀<script>PrimeFaces.cw("CommandButton")</script></td></tr><tr><td>利用目的の詳細</td><td></td></tr></table>]]></update>${vs}</changes></partial-response>`;
  const calls: URLSearchParams[] = [];
  const texts = [empty, xml(row), xml(""), small, panel];
  const f = (async (_u: string, init: RequestInit) => (calls.push(init.body as URLSearchParams), new Response(texts.shift(), { status: 200 }))) as unknown as typeof window.fetch;
  await roomSubmit(doc, f, "funcForm:search", "funcForm:search");
  await roomMore(doc, f);
  await roomMore(doc, f);
  const fields = await roomBooking(doc, f, title);
  const [open, more] = calls.slice(-2);
  expect([open!.get("jakarta.faces.source"), open!.get("keyIndex"), open!.get("valIndex"), open!.get("yykIndex")]).toEqual(["funcForm:j_id_dj", "1", "41", "0"]);
  expect([more!.get("jakarta.faces.source"), more!.has("jakarta.faces.partial.render")]).toEqual(["funcForm:j_id_ae", false]);
  expect(fields).toEqual([{ label: "承認状況", value: "承認済" }, { label: "予約番号", value: "7762" }, { label: "予約者", value: "堀 美紀" }]);
});

test("roomBooking: 一次責任者は状態・承認者・日時・所属に分け、授業は小窓の行から授業と教員を分ける", async () => {
  const doc = withCmd();
  const title = "16:50～18:30 日5 5400100641 English for Business John SMITH";
  const t2 = "00:00～24:00 予約番号：1 TOEIC";
  const row = `<tr><td><span class="kstNameArea">${NAME}</span></td><td></td><td><a id="funcForm:bar1" class="timezone zoneJugyo" title="${title}">E</a><a id="funcForm:bar2" class="timezone zoneResOther" title="${t2}">T</a></td><td></td><td></td><td></td></tr>`;
  const lesson = `<partial-response><changes><update id="funcForm:yoyakOverlay"><![CDATA[<div><div>16:50 ～18:30</div><div>日5</div><div>5400100641 English for Business</div><div>John SMITH</div></div>]]></update>${vs}</changes></partial-response>`;
  const small = `<partial-response><changes><update id="funcForm:yoyakOverlay"><![CDATA[<button id="funcForm:j_id_ae">詳細</button>]]></update>${vs}</changes></partial-response>`;
  const panel = `<partial-response><changes><update id="ksa00804:dialogPanel"><![CDATA[<table><tr><td>一次責任者</td><td>承認済 musashino2026/08/21(金) 15:31:28 学務課</td></tr></table>]]></update>${vs}</changes></partial-response>`;
  const { f } = seq(empty, xml(""), lesson, small, panel);
  doc.querySelector("tbody.ui-datatable-data")!.innerHTML = row;
  await roomSubmit(doc, f, "funcForm:search", "funcForm:search");
  await roomMore(doc, f);
  expect(await roomBooking(doc, f, title, true)).toEqual([{ label: "時限", value: "日5" }, { label: "授業コード", value: "5400100641" }, { label: "授業", value: "English for Business" }, { label: "教員", value: "John SMITH" }]);
  expect(await roomBooking(doc, f, t2)).toEqual([{ label: "一次責任者", value: "承認済" }, { label: "承認者", value: "musashino" }, { label: "承認日時", value: "2026/08/21(金) 15:31:28" }, { label: "所属", value: "学務課" }]);
});

test("roomMore: 行を読み、日付の行は除き、SUB の update は適用せず ViewState は適用する", async () => {
  const doc = makeDoc();
  const bar = `<a class="timezone zoneJugyo" style="left: 30px; width: 60px; top: 0px" title="授業">情報</a>`;
  const { f, calls } = reply(xml(`<tr class="reserveDate"><td>2026/10/24</td></tr>${tr("有明１－１１Ａ", bar)}${tr("有明１－１２Ｂ")}`));
  const rows = await roomMore(doc, f);
  expect(rows.map((r) => r.name)).toEqual(["有明1-11A", "有明1-12B"]);
  expect(rows[0]!.capacity).toBe("40");
  expect(rows[0]!.bars[0]).toMatchObject({ kind: "jugyo", text: "情報", start: 480 + 31, end: 480 + 91, openRef: "" });
  expect(doc.querySelector<HTMLInputElement>('input[name="jakarta.faces.ViewState"]')!.value).toBe("vs2");
  expect(doc.getElementById("subTbody")!.children.length).toBe(0);
  const b = calls[0]!.body;
  expect(b.get("jakarta.faces.partial.execute")).toBe(RC);
  expect(b.get("jakarta.faces.partial.render")).toBe(`${SUB} funcForm:forwardBtn`); // 「次へ」も描き直してもらう
  expect(b.get(RC)).toBe(RC);
  expect(b.get("primefaces.resetvalues")).toBe("true");
});

test("roomMore: 0 行なら []、部品が無い・応答に SUB が無いなら ParseError", async () => {
  expect(await roomMore(makeDoc(), reply(xml("")).f)).toEqual([]);
  await expect(roomMore(new DOMParser().parseFromString("<p>x</p>", "text/html"), reply(xml("")).f)).rejects.toThrow(ParseError);
  await expect(roomMore(makeDoc(), reply(`<partial-response><changes>${vs}</changes></partial-response>`).f)).rejects.toThrow(ParseError);
});

test("roomSubmit: dataList を反映し、<eval> は動かさない", async () => {
  const doc = makeDoc();
  (globalThis as { ran?: boolean }).ran = false;
  const { f, calls } = reply(`<partial-response><changes><update id="funcForm:dataList"><![CDATA[<div id="funcForm:dataList">新</div>]]></update>${vs}</changes><eval><![CDATA[globalThis.ran = true]]></eval></partial-response>`);
  await roomSubmit(doc, f, "funcForm:search", "funcForm:search funcForm:conditionArea");
  expect(doc.getElementById("funcForm:dataList")!.textContent).toBe("新");
  expect((globalThis as { ran?: boolean }).ran).toBe(false);
  const b = calls[0]!.body;
  expect(b.get("jakarta.faces.source")).toBe("funcForm:search");
  expect(b.get("jakarta.faces.partial.execute")).toBe("funcForm:search funcForm:conditionArea");
  expect(b.get("jakarta.faces.partial.render")).toBe("funcForm:dataList");
  expect(b.get("funcForm:search")).toBe("funcForm:search");
});

// 元のページはメッセージの小窓を <eval> で開く(実機の応答の形)
const dialogEval = (kind: string, msgs: string) =>
  `<eval><![CDATA[$(function() {if (typeof MessageDialog !== 'undefined') {MessageDialog.destroyDialog('errorMessageDialog', 'errDialogOpen');}});;$(function() {if (typeof MessageDialog !== 'undefined') {MessageDialog.openDialog('${kind}MessageDialog', '{"maxHeight":350,"width":560}', 'errDialogOpen', "${msgs}");}});;]]></eval>`;

test("roomSubmit: 元のページがエラー・警告の小窓を出したら、その文で失敗する(30 日超・999 件超)", async () => {
  for (const [kind, msgs, want] of [
    ["error", "<li>期間指定された日数が30日を超えています。", "期間指定された日数が30日を超えています。"],
    ["warning", "<li>検索結果が999件を超えたため、処理を中断しました。", "検索結果が999件を超えたため、処理を中断しました。"],
    ["error", "<li>一つ目。<li>二つ目。", "一つ目。 二つ目。"],
  ] as const) {
    const { f } = reply(`<partial-response><changes>${vs}</changes>${dialogEval(kind, msgs)}</partial-response>`);
    const e = await roomSubmit(makeDoc(), f, "funcForm:search", "funcForm:search").catch((x: Error) => x);
    expect((e as Error).message).toBe(want);
  }
});

test("dialogMessages: 小窓を閉じるだけの応答は空", () => {
  expect(dialogMessages(`<partial-response>${dialogEval("x", "")}</partial-response>`)).toBe("");
});
