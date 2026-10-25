import { expect, test } from "bun:test";
import { MuscatDownError, NoticeError, RedirectError } from "../errors";
import { applyDialogCalls, applyResponse } from "./apply";
import { behaviorOf, scanWidgets } from "./widgets";

const html = `<form id="f" method="post" action="/f"><input type="hidden" name="jakarta.faces.ViewState" value="vs1">
  <div id="f:out"><p>旧</p></div>
  <div id="dlg" class="ui-dialog" aria-hidden="true"></div>
  <div id="dlg3" class="ui-dialog" aria-hidden="true"></div>
  <script>PrimeFaces.cw("Dialog","dlgVar",{id:"dlg"});</script></form>
  <form id="g" method="post" action="/g"><input type="hidden" name="jakarta.faces.ViewState" value="vs1"></form>`;
const doc = () => new DOMParser().parseFromString(html, "text/html");
const pr = (inner: string) => `<?xml version="1.0" encoding="UTF-8"?><partial-response><changes>${inner}</changes></partial-response>`;
const vs = (d: Document) => [...d.querySelectorAll<HTMLInputElement>('[name="jakarta.faces.ViewState"]')].map((i) => i.value);

test("update で差し替え、ViewState は全 POST フォームへ(jakarta.faces.Resource は無視)", () => {
  const d = doc();
  applyResponse(d, pr(`<update id="f:out"><![CDATA[<div id="f:out"><p>新</p></div>]]></update><update id="jakarta.faces.Resource"><![CDATA[<script src="x"></script>]]></update><update id="j_id__v_0:jakarta.faces.ViewState:1"><![CDATA[ vs2 ]]></update>`));
  expect(d.querySelector("#f\\:out p")!.textContent).toBe("新");
  expect(vs(d)).toEqual(["vs2", "vs2"]);
});

test("更新した中の部品の初期化 script を読み直す(新しい behavior が使える)。元の script は動かない", () => {
  const d = doc();
  expect(behaviorOf(scanWidgets(d), "f:b", "click")).toBeNull();
  applyResponse(
    d,
    pr(`<update id="f:out"><![CDATA[<div id="f:out"><button id="f:b"></button><script>window.__ran = 1; PrimeFaces.cw("CommandButton","wb",{id:"f:b",behaviors:{click:function(ext){PrimeFaces.ab({s:"f:b",e:"click",f:"f"},ext);}}});</script></div>]]></update>`),
  );
  expect(behaviorOf(scanWidgets(d), "f:b", "click")).toMatchObject({ s: "f:b" });
  expect((globalThis as { __ran?: number }).__ran).toBeUndefined();
});

test("eval の PF('x').show() / hide() を、小窓の開閉として記録する(aria-hidden と data-mu-open)", () => {
  const d = doc();
  applyResponse(d, pr("") .replace("</partial-response>", `<eval><![CDATA[PF('dlgVar').show();]]></eval></partial-response>`));
  const dlg = d.getElementById("dlg")!;
  expect([dlg.getAttribute("aria-hidden"), dlg.hasAttribute("data-mu-open")]).toEqual(["false", true]);
  applyResponse(d, pr("").replace("</partial-response>", `<eval><![CDATA[$(x).y();PF('dlgVar').hide();PF('unknown').show();]]></eval></partial-response>`));
  expect([dlg.getAttribute("aria-hidden"), dlg.hasAttribute("data-mu-open")]).toEqual(["true", false]);
  // ab の onco(関数の本文)からも
  applyDialogCalls(d, "function(xhr){PF('dlgVar').show();}");
  expect(dlg.getAttribute("aria-hidden")).toBe("false");
});

test("差し替えた中の visible:true の小窓は開く", () => {
  const d = doc();
  applyResponse(d, pr(`<update id="f:out"><![CDATA[<div id="f:out"><div id="dlg9" class="ui-dialog" aria-hidden="true"></div><script>PrimeFaces.cw("Dialog","d9",{id:"dlg9",visible:true});</script></div>]]></update>`));
  expect(d.getElementById("dlg9")!.getAttribute("aria-hidden")).toBe("false");
  expect(d.getElementById("dlg")!.getAttribute("aria-hidden")).toBe("true"); // 差し替えと関係ない小窓は触らない
});

test("MessageDialog の文は NoticeError(取り込めるものは先に取り込む)", () => {
  const d = doc();
  const xml = pr(`<update id="f:out"><![CDATA[<div id="f:out"><p>新</p></div>]]></update>`).replace(
    "</partial-response>",
    `<eval><![CDATA[MessageDialog.openDialog('errorMessageDialog',{},'errDialogOpen',"<li>期間が長すぎます<li>もう一度")]]></eval></partial-response>`,
  );
  expect(() => applyResponse(d, xml)).toThrow(NoticeError);
  try {
    applyResponse(d, xml);
  } catch (e) {
    expect((e as Error).message).toBe("期間が長すぎます もう一度");
  }
  expect(d.querySelector("#f\\:out p")!.textContent).toBe("新");
});

test("<redirect> は RedirectError(行き先付き)、<error> は MuscatDownError", () => {
  const d = doc();
  try {
    applyResponse(d, `<partial-response><redirect url="/uprx/login"/></partial-response>`);
    throw new Error("投げない");
  } catch (e) {
    expect(e).toBeInstanceOf(RedirectError);
    expect((e as RedirectError).url).toBe("/uprx/login");
  }
  expect(() => applyResponse(d, `<partial-response><error><error-name>X</error-name><error-message><![CDATA[boom]]></error-message></error></partial-response>`)).toThrow(MuscatDownError);
});
