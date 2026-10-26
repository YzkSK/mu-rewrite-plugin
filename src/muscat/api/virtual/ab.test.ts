import { expect, test } from "bun:test";
import { buildAbRequest, parseAb, resolveExpr } from "./ab";

test("単純な ab: s / f / u / rv / e", () => {
  expect(parseAb(`PrimeFaces.ab({s:"headerForm:j_id_1z_1g",f:"headerForm",u:"menuForm:favorite",rv:true});return false;`)).toMatchObject({
    s: "headerForm:j_id_1z_1g",
    f: "headerForm",
    u: "menuForm:favorite",
    rv: true,
  });
  expect(parseAb(`PrimeFaces.ab({s:"a",e:"change",f:"f",p:"a"},ext);`)).toMatchObject({ s: "a", e: "change", p: "a", rv: false });
});

test("bcn の連鎖: 確認や PF().hide() は無視し、最後の ab を読む", () => {
  const cfg = parseAb(
    `PrimeFaces.bcn(this,event,[function(event){PF('forcedLogoutMode').hide();},function(event){PrimeFaces.ab({s:"headerForm:j_id_2e",f:"headerForm"});return false;}]);`,
  );
  expect(cfg).toMatchObject({ s: "headerForm:j_id_2e", f: "headerForm" });
  expect(cfg?.u).toBeUndefined();
  expect(parseAb(`PrimeFaces.confirm({source:"a:b",message:"消しますか?"});PrimeFaces.ab({s:"a:b",f:"a"});`)).toMatchObject({ s: "a:b" });
  expect(parseAb(`PrimeFaces.confirm({source:"a:b",message:"消しますか?"});return false;`)).toBeNull();
});

test("data-pfconfirmcommand の bcn: 関数を重ねても ab を読む。onco は本文を持ち、onst / oner / onsu は読み捨て", () => {
  const cfg = parseAb(
    `PrimeFaces.bcn(this,event,[function(event){PrimeFaces.ab({s:"x",f:"funcForm",p:"x",u:"@(.portalMain)",onst:function(cfg){;},onco:function(xhr,status,args){PF('dlg').hide();}});return false;}]);`,
  );
  expect(cfg).toMatchObject({ s: "x", f: "funcForm", p: "x", u: "@(.portalMain)" });
  expect(cfg?.onco).toContain("PF('dlg').hide()");
});

test("pa は name / value の配列。文字列の中の括弧や引用符でも崩れない", () => {
  const cfg = parseAb(`PrimeFaces.ab({s:"x",f:"f",pa:[{name:"a",value:"1)}"},{name:"b",value:"q\\"z"}],onco:function(){var s="}";}});`);
  expect(cfg?.pa).toEqual([{ name: "a", value: "1)}" }, { name: "b", value: 'q"z' }]);
});

test("読めない式(正規表現・アロー関数・呼び出し)があっても、あとの値を読む", () => {
  const cfg = parseAb(`PrimeFaces.ab({a:/abc/,b:(x)=>{return {};},c:PF('w'),s:"ok",f:"f"});`);
  expect(cfg).toMatchObject({ s: "ok", f: "f" });
});

test("ab が無い・壊れていれば null", () => {
  expect(parseAb("return false;")).toBeNull();
  expect(parseAb(`PrimeFaces.ab({s:`)).toBeNull();
});

const doc = () =>
  new DOMParser().parseFromString(
    `<form id="funcForm" action="/f" method="post">
      <input type="hidden" name="funcForm_SUBMIT" value="1"><input name="rx-token" value="t">
      <input type="hidden" name="jakarta.faces.ViewState" value="vs1"><input name="x" value="1"><input name="off" value="no" disabled>
      <input type="checkbox" name="c1" value="on"><input type="checkbox" name="c2" value="on" checked>
      <button id="funcForm:search" type="button">検索</button>
      <div class="portalMain" id="pm1"></div><div class="portalMain" id="pm2"></div><div class="portalMain"></div>
    </form>
    <form id="dlg:form" action="/d" method="post"><input type="hidden" name="dlg:form_SUBMIT" value="1"><input type="hidden" name="jakarta.faces.ViewState" value="vs1"><button id="dlg:form:close" type="button"></button></form>`,
    "text/html",
  );

test("検索式: @this / @form / @(css) は id にし、@all / @none / ふつうの id はそのまま", () => {
  const d = doc();
  expect(resolveExpr(d, "@this", "funcForm:search", "funcForm")).toBe("funcForm:search");
  expect(resolveExpr(d, "@form a:b", "s", "funcForm")).toBe("funcForm a:b");
  expect(resolveExpr(d, "@(.portalMain) x", "s", "funcForm")).toBe("pm1 pm2 x"); // id の無いものは除く
  expect(resolveExpr(d, "@all", "s", "f")).toBe("@all");
  expect(resolveExpr(d, "@none", "s", "f")).toBe("@none");
  expect(resolveExpr(d, "@(:bad(", "s", "f")).toBe("");
});

const keys = (b: URLSearchParams) => [...b.keys()];

test("要求 1(掲示板の検索): u だけ。execute は @all、`<s>=<s>` のあとにフォームの全項目(disabled・未チェックは除く)", () => {
  const d = doc();
  const { url, body, headers } = buildAbRequest(d, { s: "funcForm:search", f: "funcForm", u: "funcForm" });
  expect(url).toBe("https://muscat.example/f");
  expect(headers).toMatchObject({
    "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
    "Faces-Request": "partial/ajax",
    "X-Requested-With": "XMLHttpRequest",
    Accept: "application/xml, text/xml, */*; q=0.01",
  });
  expect(keys(body)).toEqual([
    "jakarta.faces.partial.ajax", "jakarta.faces.source", "jakarta.faces.partial.execute", "jakarta.faces.partial.render", "funcForm:search",
    "funcForm_SUBMIT", "rx-token", "jakarta.faces.ViewState", "x", "c2",
  ]);
  expect([...body.values()].slice(0, 5)).toEqual(["true", "funcForm:search", "@all", "funcForm", "funcForm:search"]);
});

test("要求: rv / p(検索式)/ pa、u の @none は render を付けない。f が無ければ送信元のフォーム", () => {
  const d = doc();
  const { body } = buildAbRequest(d, { s: "funcForm:search", u: "@none", p: "@this", rv: true, pa: [{ name: "k", value: "v" }] }, d.getElementById("funcForm:search"));
  expect(keys(body).slice(0, 7)).toEqual([
    "jakarta.faces.partial.ajax", "jakarta.faces.source", "primefaces.resetvalues", "jakarta.faces.partial.execute", "k", "funcForm:search", "funcForm_SUBMIT",
  ]);
  expect(body.get("jakarta.faces.partial.execute")).toBe("funcForm:search");
  expect(body.has("jakarta.faces.partial.render")).toBe(false);
  expect(() => buildAbRequest(d, { s: "a", f: "nothing" })).toThrow();
});

test("f が無く送信元がフォームの外(body 直下の小窓)なら、文書の先頭のフォーム。中のフォームではない(実機で記録)", () => {
  const d = new DOMParser().parseFromString(
    `<form id="headerForm" action="/h"><input type="hidden" name="headerForm_SUBMIT" value="1"></form>
     <div id="bsd00702:dialog"><form id="bsd00702:ch" action="/c"><input name="bsd00702:ch:x" value="on"></form></div>`,
    "text/html",
  );
  const { body } = buildAbRequest(d, { s: "bsd00702:dialog", e: "close", p: "bsd00702:dialog", rv: true }, d.getElementById("bsd00702:dialog"));
  expect(body.has("headerForm_SUBMIT")).toBe(true);
  expect(body.has("bsd00702:ch:x")).toBe(false);
});

test("要求 4(確認付きの小窓のボタン): 送信元 = execute、`<s>=<s>`、render なし、小窓のフォームの項目だけ", () => {
  const d = doc();
  const cfg = parseAb(
    `PrimeFaces.bcn(this,event,[function(event){PrimeFaces.ab({s:"dlg:form:close",f:"dlg:form",p:"dlg:form:close",onco:function(xhr,status,args){PF('dlg').hide();}});return false;}]);`,
  )!;
  const { url, body } = buildAbRequest(d, cfg, d.getElementById("dlg:form:close"));
  expect(url).toBe("https://muscat.example/d");
  expect([...body]).toEqual([
    ["jakarta.faces.partial.ajax", "true"], ["jakarta.faces.source", "dlg:form:close"], ["jakarta.faces.partial.execute", "dlg:form:close"],
    ["dlg:form:close", "dlg:form:close"], ["dlg:form_SUBMIT", "1"], ["jakarta.faces.ViewState", "vs1"],
  ]);
});

test("behavior(e あり)は behavior.event / partial.event を付け、`<s>=<s>` は付けない。部品の params は pa のあと", () => {
  const d = doc();
  const { body } = buildAbRequest(d, { s: "funcForm:t", e: "tabChange", f: "funcForm", p: "funcForm:t", u: "funcForm:t", rv: true, pa: [{ name: "pa1", value: "1" }] }, null, {
    params: [["funcForm:t_newTab", "p1"], ["funcForm:t_tabindex", "1"]],
  });
  expect(keys(body).slice(0, 10)).toEqual([
    "jakarta.faces.partial.ajax", "jakarta.faces.source", "primefaces.resetvalues", "jakarta.faces.partial.execute", "jakarta.faces.partial.render",
    "jakarta.faces.behavior.event", "jakarta.faces.partial.event", "pa1", "funcForm:t_newTab", "funcForm:t_tabindex",
  ]);
  expect(body.has("funcForm:t")).toBe(false);
});
