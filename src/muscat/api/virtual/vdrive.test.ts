import { expect, test } from "bun:test";
import { NoticeError, RedirectError } from "../errors";
import { assignRef, assignRefs } from "../driver/locator";
import { buildAbRequest } from "./ab";
import { actionOf } from "./req";
import { vdrive, type Req } from "./vdrive";

const AB = (extra = "") => `PrimeFaces.ab({s:&quot;funcForm:go&quot;,f:&quot;funcForm&quot;,u:&quot;funcForm:out&quot;${extra}});return false;`;
const cw = (type: string, id: string, rest: string) => `<script type="text/javascript">$(function(){PrimeFaces.cw("${type}","w_${id.replace(/\W/g, "")}",{id:"${id}"${rest}});});</script>`;
const behavior = (e: string, id: string, ab: string) => `${e}:function(ext,event){PrimeFaces.ab({s:"${id}",e:"${e}",f:"funcForm",p:"${id}",${ab}},ext);}`;

const html = `<form id="funcForm" action="/f" method="post">
  <input type="hidden" name="funcForm_SUBMIT" value="1">
  <input type="hidden" name="jakarta.faces.ViewState" value="vs1">
  <input id="t" name="t" value="a">
  <input id="t2" name="t2" value="a" onchange="${AB()}">
  <input id="cb" type="checkbox" name="cb" onchange="${AB()}">
  <button id="funcForm:go" type="button" onclick="${AB()}">go</button>
  <span id="wrap" onclick="${AB()}"><i><b id="deep">x</b></i></span>
  <div class="ui-confirm-dialog"><button id="yes" class="ui-confirmdialog-yes" type="button">はい</button></div>
  <div class="ui-selectbooleanbutton" id="sbb"><input type="checkbox" name="sbb" onchange="${AB()}"></div>
  <div class="ui-chkbox"><input type="checkbox" name="plain"><div class="ui-chkbox-box" id="box"></div></div>
  <div class="ui-radiobutton"><input type="radio" name="r" value="1"><div class="ui-radiobutton-box" id="rb1"></div></div>
  <div class="ui-radiobutton"><input type="radio" name="r" value="2" checked><div class="ui-radiobutton-box ui-state-active" id="rb2"></div></div>
  <a id="nav" href="/other.xhtml">move</a><a id="hash" href="#">h</a><p id="p">text</p>

  <div id="funcForm:tabArea" class="ui-tabs"><ul class="ui-tabs-nav"><li class="ui-tabs-selected ui-state-active"><a id="tab0" href="#funcForm:tabArea:0:j_id_46">A</a></li><li><a id="tab1" href="#funcForm:tabArea:1:j_id_47">B</a></li></ul>
    <div class="ui-tabs-panels"><div id="funcForm:tabArea:0:j_id_46" class="ui-tabs-panel"><p>a</p></div><div id="funcForm:tabArea:1:j_id_47" class="ui-tabs-panel ui-helper-hidden"><p>b</p></div></div>
    <input type="hidden" id="funcForm:tabArea_activeIndex" name="funcForm:tabArea_activeIndex" value="0"></div>
  ${cw("TabView", "funcForm:tabArea", `,behaviors:{${behavior("tabChange", "funcForm:tabArea", 'u:"funcForm:tabArea",rv:true')}}`)}

  <div id="funcForm:dyn" class="ui-tabs"><ul class="ui-tabs-nav"><li class="ui-tabs-selected ui-state-active"><a id="dyn0" href="#funcForm:dyn:0:p">A</a></li><li><a id="dyn1" href="#funcForm:dyn:1:p">B</a></li></ul>
    <div class="ui-tabs-panels"><div id="funcForm:dyn:0:p" class="ui-tabs-panel"><p>a</p></div><div id="funcForm:dyn:1:p" class="ui-tabs-panel ui-helper-hidden"></div></div>
    <input type="hidden" id="funcForm:dyn_activeIndex" name="funcForm:dyn_activeIndex" value="0"></div>
  ${cw("TabView", "funcForm:dyn", ",dynamic:true,cache:true")}

  <div id="funcForm:acc" class="ui-accordion">
    ${[0, 1, 2].map((i) => `<h3 id="funcForm:acc:${i}_header" class="ui-accordion-header ui-state-active"><a>H${i}</a></h3><div class="ui-accordion-content">c${i}</div>`).join("")}
    <input type="hidden" id="funcForm:acc_active" name="funcForm:acc_active" value="0,1,2,3,4,-1"></div>
  ${cw("AccordionPanel", "funcForm:acc", `,multiple:true,behaviors:{${behavior("tabChange", "funcForm:acc", 'u:"funcForm:acc"')},${behavior("tabClose", "funcForm:acc", 'u:"funcForm:acc"')}}`)}

  <select id="funcForm:sel_input" name="funcForm:sel_input"><option value="1" selected>1</option><option value="2">2</option></select>
  ${cw("SelectOneMenu", "funcForm:sel", `,behaviors:{${behavior("change", "funcForm:sel", 'u:"funcForm:out",rv:true')}}`)}

  <button id="vis1" type="button" onclick="confirmIfModified($(this).next());return false;">翌日</button>
  <button id="funcForm:hid1" type="button" style="display:none"></button>
  ${cw("CommandButton", "funcForm:hid1", `,behaviors:{${behavior("click", "funcForm:hid1", 'u:"funcForm:o1 funcForm:o2"')}}`)}
  <button id="vis2" type="button" onclick="$(this).next().click();return false;">前日</button>
  <button id="funcForm:hid2" type="button" style="display:none"></button>
  ${cw("CommandButton", "funcForm:hid2", `,behaviors:{${behavior("click", "funcForm:hid2", 'u:"funcForm:o3"')}}`)}
  <button id="vis3" type="button" onclick="confirmIfModified('funcForm:hid1');return false;">byid</button>
  </form>
  <form id="dlg:form" action="/d" method="post"><input type="hidden" name="dlg:form_SUBMIT" value="1"><input type="hidden" name="jakarta.faces.ViewState" value="vs1">
    <div id="dlg" class="ui-dialog" aria-hidden="false" data-mu-open=""><a class="ui-dialog-titlebar-close" id="dlgx"><span>x</span></a>
      <button id="dlg:form:close" type="button" onclick="PrimeFaces.confirm({source:'dlg:form:close'});return false;" data-pfconfirmcommand="PrimeFaces.bcn(this,event,[function(event){PrimeFaces.ab({s:'dlg:form:close',f:'dlg:form',p:'dlg:form:close',onco:function(xhr,status,args){PF('dlgVar').hide();}});return false;}]);">閉じる</button></div>
    <div id="dlg2" class="ui-dialog" aria-hidden="false"><a class="ui-dialog-titlebar-close" id="dlg2x"></a></div>
    ${cw("Dialog", "dlg", ',visible:false').replace("w_dlg", "dlgVar")}
    ${cw("Dialog", "dlg2", `,behaviors:{close:function(ext,event){PrimeFaces.ab({s:"dlg2",e:"close",p:"dlg2",u:"@none"},ext);}}`)}
  </form>
  ${[3, 4].map((n) => `<form id="dlg${n}:f" action="/d${n}" method="post"><input type="hidden" name="dlg${n}:f_SUBMIT" value="1"><input type="hidden" name="jakarta.faces.ViewState" value="vs1">
    <div id="dlg${n}" class="ui-dialog" aria-hidden="false"><a class="ui-dialog-titlebar-close" id="dlg${n}x"></a>
      <button id="dlg${n}:f:cb" class="dispNone" type="button" onclick="PrimeFaces.confirm({source:&quot;dlg${n}:f:cb&quot;,type:&quot;dialog&quot;});return false;"></button></div>
    ${cw("CommandButton", `dlg${n}:f:cb`, `,behaviors:{click:function(ext,event){PrimeFaces.ab({s:"dlg${n}:f:cb",f:"dlg${n}:f",p:"dlg${n}:f:cb"},ext);}}`).replace(`w_dlg${n}fcb`, `dlg${n}Var-closeBtn`)}
    ${cw("Dialog", `dlg${n}`, n === 4 ? `,behaviors:{close:function(ext,event){PrimeFaces.ab({s:"dlg4",e:"close",p:"dlg4",rv:true},ext);}}` : "").replace(`w_dlg${n}`, `dlg${n}Var`)}
  </form>`).join("")}`;

const OK = `<partial-response><changes><update id="j_id__v_0:jakarta.faces.ViewState:1"><![CDATA[vs2]]></update></changes></partial-response>`;

function setup(response = OK) {
  const doc = new DOMParser().parseFromString(html, "text/html");
  assignRefs(doc);
  const sent: Req[] = [];
  const pages: Req[] = [];
  const io = { post: async (_k: string, req: Req) => (sent.push(req), response), page: async (req: Req) => void pages.push(req) };
  const ref = (id: string) => assignRef(doc.getElementById(id)!);
  const el = <T extends HTMLElement>(id: string) => doc.getElementById(id) as T;
  const run = (steps: Parameters<typeof vdrive>[1]) => vdrive(doc, steps, io);
  const click = (id: string) => run([{ kind: "click", ref: ref(id) }]);
  return { doc, sent, pages, io, ref, el, run, click };
}
const keys = (r: Req) => [...r.body.keys()];

test("set: 値と属性を入れる。onchange の ab があれば送り、ViewState が更新される", async () => {
  const { doc, sent, ref, el, run } = setup();
  expect(await run([{ kind: "set", ref: ref("t"), value: "b" }])).toBe("none");
  expect(el<HTMLInputElement>("t").getAttribute("value")).toBe("b");
  expect(await run([{ kind: "set", ref: ref("t2"), value: "z" }])).toBe("done");
  expect(sent).toHaveLength(1);
  expect(sent[0]!.body.get("t2")).toBe("z");
  expect(sent[0]!.body.get("jakarta.faces.partial.render")).toBe("funcForm:out");
  expect(doc.querySelector<HTMLInputElement>('[name="jakarta.faces.ViewState"]')!.value).toBe("vs2");
});

test("要求 5(SelectOneMenu の change): 部品の change behavior。e = change、render は u、rv、選んだ値がフォームの項目に入る", async () => {
  const { sent, ref, run } = setup();
  expect(await run([{ kind: "set", ref: ref("funcForm:sel_input"), value: "2" }])).toBe("done");
  const r = sent[0]!;
  expect(keys(r).slice(0, 7)).toEqual([
    "jakarta.faces.partial.ajax", "jakarta.faces.source", "primefaces.resetvalues", "jakarta.faces.partial.execute", "jakarta.faces.partial.render",
    "jakarta.faces.behavior.event", "jakarta.faces.partial.event",
  ]);
  expect(r.body.get("jakarta.faces.source")).toBe("funcForm:sel");
  expect(r.body.get("jakarta.faces.partial.render")).toBe("funcForm:out");
  expect(r.body.get("jakarta.faces.behavior.event")).toBe("change");
  expect(r.body.get("funcForm:sel_input")).toBe("2");
  expect(r.body.has("funcForm:sel")).toBe(false);
});

test("check: 状態を入れ、変わったときだけ onchange の ab を送る", async () => {
  const { sent, ref, el, run } = setup();
  expect(await run([{ kind: "check", ref: ref("cb"), checked: false }])).toBe("none");
  expect(await run([{ kind: "check", ref: ref("cb"), checked: true }])).toBe("done");
  expect(el<HTMLInputElement>("cb").hasAttribute("checked")).toBe(true);
  expect(sent[0]!.body.get("cb")).toBe("on");
});

test("click: 要素と 3 つ上までの祖先の onclick の ab を送る", async () => {
  const { sent, click } = setup();
  await click("funcForm:go");
  await click("deep");
  expect(sent).toHaveLength(2);
  expect(sent.every((s) => s.body.get("jakarta.faces.source") === "funcForm:go")).toBe(true);
});

test("click: 確認の小窓のボタンは何も送らない", async () => {
  const { sent, click } = setup();
  expect(await click("yes")).toBe("none");
  expect(sent).toHaveLength(0);
});

test("要求 2(TabView の tabChange): resetvalues・execute/render・event・newTab/tabindex、activeIndex は先に新しい番号", async () => {
  const { sent, click, doc } = setup();
  expect(await click("tab1")).toBe("done");
  const r = sent[0]!;
  expect(keys(r).slice(0, 11)).toEqual([
    "jakarta.faces.partial.ajax", "jakarta.faces.source", "primefaces.resetvalues", "jakarta.faces.partial.execute", "jakarta.faces.partial.render",
    "jakarta.faces.behavior.event", "jakarta.faces.partial.event", "funcForm:tabArea_newTab", "funcForm:tabArea_tabindex", "funcForm_SUBMIT", "jakarta.faces.ViewState",
  ]);
  expect(r.body.get("jakarta.faces.source")).toBe("funcForm:tabArea");
  expect(r.body.get("funcForm:tabArea_newTab")).toBe("funcForm:tabArea:1:j_id_47");
  expect(r.body.get("funcForm:tabArea_tabindex")).toBe("1");
  expect(r.body.get("funcForm:tabArea_activeIndex")).toBe("1");
  expect(doc.querySelectorAll("#funcForm\\:tabArea .ui-tabs-nav li")[1]!.classList.contains("ui-state-active")).toBe(true);
  // 選択中のタブを押しても何も送らない
  expect(await click("tab1")).toBe("none");
});

test("要求 6(動的な TabView): 中身が空なら ignoreautoupdate・contentLoad・newTab・tabindex・`<id>=<id>`。中身があれば通信なし", async () => {
  const { sent, click, doc } = setup();
  expect(await click("dyn1")).toBe("done");
  const r = sent[0]!;
  expect(keys(r).slice(0, 11)).toEqual([
    "jakarta.faces.partial.ajax", "jakarta.faces.source", "primefaces.ignoreautoupdate", "jakarta.faces.partial.execute", "jakarta.faces.partial.render",
    "funcForm:dyn", "funcForm:dyn_contentLoad", "funcForm:dyn_newTab", "funcForm:dyn_tabindex", "funcForm_SUBMIT", "jakarta.faces.ViewState",
  ]);
  expect([r.body.get("jakarta.faces.partial.execute"), r.body.get("jakarta.faces.partial.render")]).toEqual(["funcForm:dyn", "funcForm:dyn"]);
  expect(r.body.get("funcForm:dyn")).toBe("funcForm:dyn");
  expect([r.body.get("funcForm:dyn_contentLoad"), r.body.get("funcForm:dyn_newTab"), r.body.get("funcForm:dyn_tabindex")]).toEqual(["true", "funcForm:dyn:1:p", "1"]);
  expect(r.body.get("funcForm:dyn_activeIndex")).toBe("1");
  // 読み込み済み(中身あり)のタブへ戻るのは通信なし
  doc.getElementById("funcForm:dyn:0:p")!.innerHTML = "<p>a</p>";
  expect(await click("dyn0")).toBe("none");
  expect(sent).toHaveLength(1);
  expect((doc.getElementById("funcForm:dyn_activeIndex") as HTMLInputElement).value).toBe("0");
});

test("要求 3(AccordionPanel): 閉じると番号を除き tabClose、開くと末尾に足し tabChange。送る前に _active を直す", async () => {
  const t = setup();
  const head = (i: number) => t.el(`funcForm:acc:${i}_header`);
  await t.run([{ kind: "click", ref: assignRef(head(1)) }]);
  const close = t.sent[0]!;
  expect(close.body.get("jakarta.faces.behavior.event")).toBe("tabClose");
  expect(close.body.get("funcForm:acc_tabId")).toBe("funcForm:acc:1");
  expect(close.body.get("funcForm:acc_tabindex")).toBe("1");
  expect(close.body.get("funcForm:acc_active")).toBe("0,2,3,4,-1");
  await t.run([{ kind: "click", ref: assignRef(head(1)) }]);
  const open = t.sent[1]!;
  expect(open.body.get("jakarta.faces.behavior.event")).toBe("tabChange");
  expect(open.body.get("funcForm:acc_newTab")).toBe("funcForm:acc:1");
  expect(open.body.has("funcForm:acc_tabId")).toBe(false);
  expect(open.body.get("funcForm:acc_active")).toBe("0,2,3,4,-1,1");
});

test("要求 4(確認付きの小窓のボタン): data-pfconfirmcommand の ab を送り、onco の PF().hide() で小窓が閉じた記録になる", async () => {
  const { sent, click, el } = setup();
  expect(await click("dlg:form:close")).toBe("done");
  expect([...sent[0]!.body]).toEqual([
    ["jakarta.faces.partial.ajax", "true"], ["jakarta.faces.source", "dlg:form:close"], ["jakarta.faces.partial.execute", "dlg:form:close"],
    ["dlg:form:close", "dlg:form:close"], ["dlg:form_SUBMIT", "1"], ["jakarta.faces.ViewState", "vs1"],
  ]);
  expect(el("dlg").getAttribute("aria-hidden")).toBe("true");
  expect(el("dlg").hasAttribute("data-mu-open")).toBe(false);
});

test("小窓の ✕: 閉じた記録にし、close の behavior があれば送る(ab に f が無くても小窓のフォームで)", async () => {
  const { sent, click, el } = setup();
  expect(await click("dlgx")).toBe("none");
  expect(el("dlg").getAttribute("aria-hidden")).toBe("true");
  expect(await click("dlg2x")).toBe("done");
  expect(el("dlg2").getAttribute("aria-hidden")).toBe("true");
  expect(sent[0]!.body.get("jakarta.faces.behavior.event")).toBe("close");
});

test("小窓の ✕(実機で記録): <widgetVar>-closeBtn の隠しボタンの通信を送る。close の behavior もあれば、そのあとに送る", async () => {
  const only = setup();
  expect(await only.click("dlg3x")).toBe("done");
  expect(only.el("dlg3").getAttribute("aria-hidden")).toBe("true");
  expect([...only.sent[0]!.body]).toEqual([
    ["jakarta.faces.partial.ajax", "true"], ["jakarta.faces.source", "dlg3:f:cb"], ["jakarta.faces.partial.execute", "dlg3:f:cb"],
    ["dlg3:f:cb", "dlg3:f:cb"], ["dlg3:f_SUBMIT", "1"], ["jakarta.faces.ViewState", "vs1"],
  ]);
  expect(only.sent.length).toBe(1);

  const both = setup();
  expect(await both.click("dlg4x")).toBe("done");
  expect(both.sent.map((r) => [r.body.get("jakarta.faces.source"), r.body.get("jakarta.faces.behavior.event")])).toEqual([
    ["dlg4:f:cb", null],
    ["dlg4", "close"],
  ]);
});

test("小窓の ✕: 同じ widgetVar の消えた closeBtn が表に先にあっても、今ある要素のボタンを送る", async () => {
  const { doc, sent, click } = setup();
  doc.body.insertAdjacentHTML("afterbegin", cw("CommandButton", "gone:cb", `,behaviors:{click:function(ext,event){PrimeFaces.ab({s:"gone:cb",f:"dlg3:f",p:"gone:cb"},ext);}}`).replace("w_gonecb", "dlg3Var-closeBtn"));
  expect(await click("dlg3x")).toBe("done");
  expect(sent.map((r) => r.body.get("jakarta.faces.source"))).toEqual(["dlg3:f:cb"]);
});

const TBL = "funcForm:jinjiListMd4";
const tableDoc = () =>
  new DOMParser().parseFromString(
    `<form id="funcForm" action="/f" method="post"><input type="hidden" name="jakarta.faces.ViewState" value="vs1"><input name="funcForm:searchNameM4" value="佐藤">
    <div id="${TBL}" class="ui-datatable"><div id="${TBL}_paginator_top" class="ui-paginator ui-paginator-top"><span class="ui-paginator-current">25件 (1 / 3)</span>
      <a class="ui-paginator-first ui-state-disabled"></a><a class="ui-paginator-prev ui-state-disabled"></a>
      <span class="ui-paginator-pages"><a class="ui-paginator-page ui-state-default ui-state-active">1</a><a class="ui-paginator-page ui-state-default">2</a><a class="ui-paginator-page ui-state-default">3</a></span>
      <a class="ui-paginator-next"></a><a class="ui-paginator-last"></a>
      <select class="ui-paginator-rpp-options"><option value="10" selected>10</option><option value="25">25</option></select></div>
      <table><tbody id="${TBL}_data" class="ui-datatable-data">${[0, 1].map((i) => `<tr data-ri="${i}"><td>old${i}</td></tr>`).join("")}</tbody></table></div>
    <script>PrimeFaces.cw("DataTable","w",{id:"${TBL}",paginator:{rows:10,rowCount:25,page:0,pageLinks:5,currentPageTemplate:"{totalRecords}件 ({currentPage} / {totalPages})"},behaviors:{page:function(ext,event){PrimeFaces.ab({s:"${TBL}",e:"page",f:"funcForm",p:"${TBL}",rv:true},ext);}}});</script></form>`,
    "text/html",
  );
const rowsXml = (first: number, n: number) =>
  `<partial-response><changes><update id="${TBL}"><![CDATA[${Array.from({ length: n }, (_, i) => `<tr data-ri="${first + i}" class="ui-widget-content"><td>row${first + i}</td></tr>`).join("")}]]></update><update id="j_id__v_0:jakarta.faces.ViewState:1"><![CDATA[vs2]]></update></changes></partial-response>`;

test("DataTable のページ送り(実機で記録した要求): render は表の id、_page は付けない。応答の行を本体に入れ、ページャーを直す", async () => {
  const doc = tableDoc();
  assignRefs(doc);
  const sent: Req[] = [];
  const io = { post: async (_k: string, r: Req) => (sent.push(r), rowsXml(10, 10)), page: async () => {} };
  const page2 = [...doc.querySelectorAll<HTMLElement>(".ui-paginator-page")][1]!;
  expect(await vdrive(doc, [{ kind: "click", ref: assignRef(page2) }], io)).toBe("done");
  expect([...sent[0]!.body].slice(0, 12)).toEqual([
    ["jakarta.faces.partial.ajax", "true"], ["jakarta.faces.source", TBL], ["primefaces.resetvalues", "true"], ["jakarta.faces.partial.execute", TBL],
    ["jakarta.faces.partial.render", TBL], ["jakarta.faces.behavior.event", "page"], ["jakarta.faces.partial.event", "page"],
    [`${TBL}_pagination`, "true"], [`${TBL}_first`, "10"], [`${TBL}_rows`, "10"], [`${TBL}_skipChildren`, "true"], [`${TBL}_encodeFeature`, "true"],
  ]);
  expect(sent[0]!.body.get("funcForm:searchNameM4")).toBe("佐藤");
  expect(sent[0]!.body.has(`${TBL}_page`)).toBe(false);
  // 表は差し替えず、本体の行だけ新しいものに
  expect(doc.getElementById(TBL)!.classList.contains("ui-datatable")).toBe(true);
  expect([...doc.querySelectorAll(`#${CSS.escape(TBL)}_data > tr`)].map((r) => r.getAttribute("data-ri"))).toEqual(["10", "11", "12", "13", "14", "15", "16", "17", "18", "19"]);
  expect(doc.querySelector(".ui-paginator-current")!.textContent).toBe("25件 (2 / 3)");
  expect([...doc.querySelectorAll(".ui-paginator-page")].map((a) => [a.textContent, a.classList.contains("ui-state-active")])).toEqual([["1", false], ["2", true], ["3", false]]);
  const off = (k: string) => doc.querySelector(`.ui-paginator-${k}`)!.classList.contains("ui-state-disabled");
  expect([off("first"), off("prev"), off("next"), off("last")]).toEqual([false, false, false, false]);
  expect(doc.querySelector<HTMLInputElement>('[name="jakarta.faces.ViewState"]')!.value).toBe("vs2");
  // 続けて「次へ」→ 最後のページ(first=20)
  io.post = async (_k, r) => (sent.push(r), rowsXml(20, 5));
  await vdrive(doc, [{ kind: "click", ref: assignRef(doc.querySelector(".ui-paginator-next")!) }], io);
  expect(sent[1]!.body.get(`${TBL}_first`)).toBe("20");
  expect(doc.querySelector(".ui-paginator-current")!.textContent).toBe("25件 (3 / 3)");
  expect([off("next"), off("last")]).toEqual([true, true]);
  expect(doc.querySelectorAll(`#${CSS.escape(TBL)}_data > tr`)).toHaveLength(5);
});

test("DataTable の 1 ページの件数を変える: rows が新しい件数で first=0、ページャーは 1 ページ目・新しい総ページ数に", async () => {
  const doc = tableDoc();
  assignRefs(doc);
  const sent: Req[] = [];
  const io = { post: async (_k: string, r: Req) => (sent.push(r), rowsXml(0, 25)), page: async () => {} };
  const select = doc.querySelector<HTMLElement>(".ui-paginator-rpp-options")!;
  await vdrive(doc, [{ kind: "set", ref: assignRef(select), value: "25" }], io);
  expect([sent[0]!.body.get(`${TBL}_first`), sent[0]!.body.get(`${TBL}_rows`)]).toEqual(["0", "25"]);
  expect(doc.querySelector(".ui-paginator-current")!.textContent).toBe("25件 (1 / 1)");
  expect(doc.querySelectorAll(".ui-paginator-page")).toHaveLength(1);
  expect(doc.querySelector(".ui-paginator-next")!.classList.contains("ui-state-disabled")).toBe(true);
});

const LINK = "funcForm:jinjiListMd4:0:j_id_nj";
const NEW_PAGE = `<?xml version='1.0' encoding='UTF-8' ?><!DOCTYPE html><html xmlns="http://www.w3.org/1999/xhtml"><head><script>var a = "x"; //<![CDATA[ var b = 1; //]]></script></head><body><form id="funcForm" action="/uprx/up/bs/bsa011/Bsa01101.xhtml" method="post"><input type="hidden" name="jakarta.faces.ViewState" value="old"><div class="teacherBaseInfoLeft"><p>教員名：佐藤 太郎</p></div><div id="funcForm:j_id_3x" class="kyoinSchedule"></div><script>PrimeFaces.cw("Schedule","s",{id:"funcForm:j_id_3x"});</script></form></body></html>`;
/** ページの中の ]]> で CDATA が分かれて来る形(実機で記録) */
const viewRoot = `<?xml version='1.0' encoding='UTF-8'?><partial-response id="j_id__v_0"><changes><update id="jakarta.faces.ViewRoot"><![CDATA[${NEW_PAGE.replaceAll("]]>", "]]]]><![CDATA[>")}]]></update><update id="j_id__v_0:jakarta.faces.ViewState:0"><![CDATA[vsNew]]></update></changes></partial-response>`;

test("表の行のリンク(fp 付き)→ ViewRoot の応答: 処理先に fp を足し、CDATA をつないで新しい画面として渡す(元の Document には触らず、続きの手順はやめる)", async () => {
  const doc = new DOMParser().parseFromString(
    `<form id="funcForm" action="/f" method="post"><input type="hidden" name="jakarta.faces.ViewState" value="vs1"><input name="funcForm:searchNameM4" value="佐藤">
      <a id="${LINK}" class="ui-commandlink" href="#" onclick="PrimeFaces.ab({s:&quot;${LINK}&quot;,f:&quot;funcForm&quot;,p:&quot;${LINK}&quot;,rv:true,fp:&quot;funcForm:jinjiListMd4:0:j_id_ni&quot;});return false;">佐藤</a><button id="b2" type="button" onclick="${AB()}"></button></form>`,
    "text/html",
  );
  assignRefs(doc);
  const before = doc.documentElement.outerHTML;
  const sent: Req[] = [];
  const got: Document[] = [];
  const io = { post: async (_k: string, r: Req) => (sent.push(r), viewRoot), page: async () => {}, replace: (d: Document) => void got.push(d) };
  expect(await vdrive(doc, [{ kind: "click", ref: assignRef(doc.getElementById(LINK)!) }, { kind: "click", ref: assignRef(doc.getElementById("b2")!) }], io)).toBe("done");
  expect(sent).toHaveLength(1); // 2 つ目の手順は送らない
  expect([...sent[0]!.body].slice(0, 6)).toEqual([
    ["jakarta.faces.partial.ajax", "true"], ["jakarta.faces.source", LINK], ["primefaces.resetvalues", "true"],
    ["jakarta.faces.partial.execute", `${LINK} funcForm:jinjiListMd4:0:j_id_ni`], [LINK, LINK], ["jakarta.faces.ViewState", "vs1"],
  ]);
  expect(sent[0]!.body.has("jakarta.faces.partial.render")).toBe(false);
  const next = got[0]!;
  expect(next.querySelector(".teacherBaseInfoLeft p")!.textContent).toBe("教員名：佐藤 太郎");
  expect(next.querySelector("script")).toBeNull();
  expect(next.querySelector<HTMLInputElement>('[name="jakarta.faces.ViewState"]')!.value).toBe("vsNew");
  expect(doc.documentElement.outerHTML).toBe(before);
});

test("ViewRoot で替わった画面の相対 action は、その ab を送った URL が基準(元のブラウザの URL ではない)", async () => {
  const page = NEW_PAGE.replace('action="/uprx/up/bs/bsa011/Bsa01101.xhtml"', 'action="Bsa01101.xhtml"');
  const root = `<partial-response><changes><update id="jakarta.faces.ViewRoot"><![CDATA[${page}]]></update></changes></partial-response>`;
  const doc = new DOMParser().parseFromString(`<form id="funcForm" action="/uprx/up/bs/bsa011/Bsa01100.xhtml" method="post"><button id="g" type="button" onclick="${AB()}"></button></form>`, "text/html");
  assignRefs(doc);
  const got: Document[] = [];
  await vdrive(doc, [{ kind: "click", ref: assignRef(doc.getElementById("g")!) }], { post: async () => root, page: async () => {}, replace: (d) => void got.push(d) });
  const next = got[0]!;
  expect(actionOf(next.getElementById("funcForm")!)).toBe("https://muscat.example/uprx/up/bs/bsa011/Bsa01101.xhtml");
  expect(buildAbRequest(next, { s: "funcForm:j_id_3x", f: "funcForm" }).url).toBe("https://muscat.example/uprx/up/bs/bsa011/Bsa01101.xhtml");
});

test("ajax ではないリンク(addSubmitParam … submit): フォームの全項目 + 足す項目で、画面ごとの POST", async () => {
  const doc = new DOMParser().parseFromString(
    `<form id="funcHeader" action="/h" method="post"><input type="hidden" name="jakarta.faces.ViewState" value="v"><input name="funcHeader_SUBMIT" type="hidden" value="1">
      <a id="funcHeader:crumb" href="#" onclick="syncTransition('funcHeader:crumb');PrimeFaces.addSubmitParam('funcHeader',{'funcHeader:crumb':'funcHeader:crumb'}).submit('funcHeader');return false;">教職員検索</a></form>`,
    "text/html",
  );
  assignRefs(doc);
  const pages: Req[] = [];
  expect(await vdrive(doc, [{ kind: "click", ref: assignRef(doc.getElementById("funcHeader:crumb")!) }], { post: async () => OK, page: async (r) => void pages.push(r) })).toBe("none");
  expect([...pages[0]!.body]).toEqual([["jakarta.faces.ViewState", "v"], ["funcHeader_SUBMIT", "1"], ["funcHeader:crumb", "funcHeader:crumb"], ["rx.sync.source", "funcHeader:crumb"]]);
  expect(pages[0]!.url).toBe("https://muscat.example/h");
});

test("掲示板の詳細の ✕: 小窓がフォームの外で、close の ab に f が無くても、小窓の中のフォームで送って閉じる", async () => {
  const doc = new DOMParser().parseFromString(
    `<div id="bsd00702:dialog" class="ui-dialog" aria-hidden="false" data-mu-open=""><a class="ui-dialog-titlebar-close" id="x"></a>
      <form id="bsd00702:f" action="/d" method="post"><input type="hidden" name="jakarta.faces.ViewState" value="v"></form></div>
     <script>PrimeFaces.cw("Dialog","w",{id:"bsd00702:dialog",behaviors:{close:function(ext){PrimeFaces.ab({s:"bsd00702:dialog",e:"close",p:"bsd00702:dialog"},ext);}}});</script>`,
    "text/html",
  );
  assignRefs(doc);
  const sent: Req[] = [];
  const io = { post: async (_k: string, r: Req) => (sent.push(r), OK), page: async () => {} };
  expect(await vdrive(doc, [{ kind: "click", ref: assignRef(doc.getElementById("x")!) }], io)).toBe("done");
  expect(sent[0]!.url).toBe("https://muscat.example/d");
  expect(sent[0]!.body.get("jakarta.faces.behavior.event")).toBe("close");
  expect(doc.getElementById("bsd00702:dialog")!.getAttribute("aria-hidden")).toBe("true");
});

test("set: 値が変わらなければ change の通信は送らない(ブラウザと同じ)", async () => {
  const { sent, ref, run } = setup();
  expect(await run([{ kind: "set", ref: ref("funcForm:sel_input"), value: "1" }, { kind: "set", ref: ref("t2"), value: "a" }])).toBe("none");
  expect(sent).toHaveLength(0);
});

test("要求 8(サイトの JS): confirmIfModified($(this).next()) と $(this).next().click() は次の兄弟の click behavior、confirmIfModified('id') はその id", async () => {
  const { sent, click } = setup();
  await click("vis1");
  await click("vis2");
  await click("vis3");
  expect(sent.map((s) => s.body.get("jakarta.faces.source"))).toEqual(["funcForm:hid1", "funcForm:hid2", "funcForm:hid1"]);
  expect(sent[0]!.body.get("jakarta.faces.partial.render")).toBe("funcForm:o1 funcForm:o2");
  expect(sent[0]!.body.get("jakarta.faces.behavior.event")).toBe("click");
  expect(sent[0]!.body.get("jakarta.faces.partial.execute")).toBe("funcForm:hid1");
});

test("click: 枠・ボタンの下の input を切り替え、onchange の ab を送る(ab が無ければ送らない)", async () => {
  const { doc, sent, click, el } = setup();
  await click("box");
  expect(el("box").classList.contains("ui-state-active")).toBe(true);
  expect(doc.querySelector<HTMLInputElement>('[name="plain"]')!.checked).toBe(true);
  await click("rb1");
  expect(doc.querySelector<HTMLInputElement>('[name="r"][value="1"]')!.checked).toBe(true);
  expect(doc.querySelector<HTMLInputElement>('[name="r"][value="2"]')!.checked).toBe(false);
  expect(el("rb2").classList.contains("ui-state-active")).toBe(false);
  expect(sent).toHaveLength(0);
  expect(await click("sbb")).toBe("done");
  expect(sent).toHaveLength(1);
});

test("click: ふつうのリンクは NoticeError、# のリンクと本文は何もしない", async () => {
  const { sent, click, run, ref } = setup();
  await expect(click("nav")).rejects.toThrow(NoticeError);
  expect(await run([{ kind: "click", ref: ref("hash") }, { kind: "click", ref: ref("p") }])).toBe("none");
  expect(sent).toHaveLength(0);
});

test("click: サイトの JS だけの確認付きボタン($(this).click())は画面ごとの POST(ヘッダーのフォームの項目 + id= + rx.sync.source)", async () => {
  const doc = new DOMParser().parseFromString(
    `<form id="headerForm" action="/h" method="post"><input name="rx-token" value="t"><input type="hidden" name="jakarta.faces.ViewState" value="v"><a id="headerForm:logo" onclick="PrimeFaces.confirm({source:'headerForm:logo'});" data-pfconfirmcommand="syncTransition(this);$(this).click();">logo</a></form>`,
    "text/html",
  );
  assignRefs(doc);
  const pages: Req[] = [];
  const io = { post: async () => OK, page: async (r: Req) => void pages.push(r) };
  await vdrive(doc, [{ kind: "click", ref: assignRef(doc.getElementById("headerForm:logo")!) }], io);
  expect([...pages[0]!.body]).toEqual([["rx-token", "t"], ["jakarta.faces.ViewState", "v"], ["headerForm:logo", ""], ["rx.sync.source", "headerForm:logo"]]);
});

test("ref が無ければ何も操作せず Error。応答の警告の小窓は NoticeError、<redirect> は RedirectError", async () => {
  const { sent, ref, run } = setup();
  await expect(run([{ kind: "set", ref: ref("t"), value: "x" }, { kind: "click", ref: "c9999" }])).rejects.toThrow();
  expect(sent).toHaveLength(0);
  const w = setup(`<partial-response><changes></changes><eval><![CDATA[MessageDialog.openDialog('errorMessageDialog',{},'errDialogOpen',"<li>だめです")]]></eval></partial-response>`);
  await expect(w.click("funcForm:go")).rejects.toThrow(NoticeError);
  const r = setup(`<partial-response><redirect url="/uprx/login"/></partial-response>`);
  await expect(r.click("funcForm:go")).rejects.toThrow(RedirectError);
});
