import { expect, test } from "bun:test";
import { behaviorOf, scanWidgets, scriptIdWith } from "./widgets";

const doc = (scripts: string) => new DOMParser().parseFromString(`<form id="f">${scripts}</form>`, "text/html");

test("PrimeFaces.cw の初期化から、id → 種類・設定・behaviors の表を作る(動かさずに文字を読む)", () => {
  const d = doc(`
    <script type="text/javascript">$(function(){PrimeFaces.cw("TabView","widget_tab",{id:"f:tab",dynamic:true,cache:false,activeIndex:0,onTabChange:function(i){PF('x').hide();},behaviors:{tabChange:function(ext,event){PrimeFaces.ab({s:"f:tab",e:"tabChange",f:"f",p:"f:tab",u:"f:tab",rv:true},ext);}}});});</script>
    <script>PrimeFaces.cw("CommandButton","b1",{id:"f:b1",behaviors:{click:function(ext,event){PrimeFaces.ab({s:"f:b1",e:"click",f:"f",p:"@this",u:"f:o1 f:o2"},ext);}}});PrimeFaces.cw("Dialog","dlgVar",{id:"f:dlg",visible:true,pattern:/ab(c)/g,x:PF('y'),behaviors:{close:function(ext){PrimeFaces.ab({s:"f:dlg",e:"close"},ext);}}});</script>
    <script type="text/x-other">PrimeFaces.cw('AccordionPanel','acc',{id:'f:acc',multiple:true})</script>`);
  const w = scanWidgets(d);
  expect([...w.keys()]).toEqual(["f:tab", "f:b1", "f:dlg", "f:acc"]);
  expect(w.get("f:tab")).toMatchObject({ type: "TabView", widgetVar: "widget_tab", id: "f:tab" });
  expect(w.get("f:tab")!.cfg.dynamic).toBe(true);
  expect(w.get("f:tab")!.cfg.activeIndex).toBe(0);
  expect(Object.keys(w.get("f:tab")!.behaviors)).toEqual(["tabChange"]);
  expect(w.get("f:acc")!.cfg.multiple).toBe(true);
  expect(w.get("f:dlg")!.cfg.visible).toBe(true);
  expect(behaviorOf(w, "f:tab", "tabChange")).toMatchObject({ s: "f:tab", e: "tabChange", rv: true });
  expect(behaviorOf(w, "f:b1", "change", "click")).toMatchObject({ e: "click", u: "f:o1 f:o2", p: "@this" });
  expect(behaviorOf(w, "f:b1", "change")).toBeNull();
  expect(behaviorOf(w, "nothing", "click")).toBeNull();
  expect(behaviorOf(w, undefined, "click")).toBeNull();
});

test("script は読んだら文書から取り除く(画面の文字に混ざらない)。部品の表と id 付き script の文字は残る", () => {
  const d = doc(`<a id="f:l">中国語基礎2</a><script id="f:l_s" type="text/javascript">PrimeFaces.cw("CommandLink","w",{id:"f:l"});</script><script id="f:rc">var subTableRun=function(){};</script>`);
  expect(scanWidgets(d).has("f:l")).toBe(true);
  expect(d.querySelectorAll("script").length).toBe(0);
  expect(d.getElementById("f")?.textContent ?? d.querySelector("form")!.textContent).toBe("中国語基礎2");
  expect(scriptIdWith(d, "subTableRun")).toBe("f:rc");
  expect(scriptIdWith(d, "nothing")).toBeUndefined();
  expect(scanWidgets(d).has("f:l")).toBe(true); // もう script が無くても表は残る
});

test("読めない初期化は飛ばし、ほかの部品は読む。cw が無い script は無視", () => {
  const w = scanWidgets(doc(`<script>PrimeFaces.cw("A","a",{id:});</script><script>PrimeFaces.cw("B","b",{id:"f:b"});</script><script>var x = 1;</script>`));
  expect([...w.keys()]).toEqual(["f:b"]);
});
