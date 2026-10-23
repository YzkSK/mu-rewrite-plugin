import { expect, test } from "bun:test";
import { ParseError } from "../errors";
import type { GBlock, GControl } from "../types";
import { parseGenericPage } from "./generic";

const page = (inner: string) => new DOMParser().parseFromString(`<form id="funcForm">${inner}</form>`, "text/html");
const blocks = (inner: string) => parseGenericPage(page(inner)).blocks;
const kinds = (b: GBlock[]) => b.map((x) => x.kind);

test("#funcForm が無ければ ParseError", () => {
  expect(() => parseGenericPage(new DOMParser().parseFromString("<p>x</p>", "text/html"))).toThrow(ParseError);
});

test("見出し(アコーディオン・h3・panel title・legend)と、文字だけのブロックは message", () => {
  const b = blocks(`<h3 class="ui-accordion-header"><span class="ui-icon"></span>基本</h3><div>x</div><h3>見出し</h3><span class="ui-panel-title">パネル</span><legend class="ui-fieldset-legend">凡例</legend><div>対象のデータが存在しません。</div>`);
  expect(b.map((x) => (x as { text: string }).text)).toEqual(["基本", "x", "見出し", "パネル", "凡例", "対象のデータが存在しません。"]);
  expect(kinds(b)).toEqual(["heading", "message", "heading", "heading", "heading", "message"]);
});

test("同じ親の中のインラインの断片は 1 つの message、div で区切れば別", () => {
  const b = blocks(`<div><span>掲示</span> <span>2026/10/19</span><a class="ui-commandlink" href="#">タイトル</a> [<span>発信元</span>]</div><div><div>一</div><div>二</div></div>`);
  expect(b).toEqual([{ kind: "message", text: "掲示 2026/10/19 タイトル [ 発信元 ]" }, { kind: "message", text: "一" }, { kind: "message", text: "二" }]);
});

test("見出し・操作部品の境目で区切る", () => {
  const b = blocks(`<div>前 <span>文</span><input name="a" value="1"> 後 <span>文</span></div>`);
  expect(b).toMatchObject([{ kind: "message", text: "前 文" }, { kind: "controls" }, { kind: "message", text: "後 文" }]);
});

test("ui-button の文字は拾わない(ボタンの label にも使わない)", () => {
  const b = blocks(`<div><a class="ui-button" href="#"><span class="ui-button-text">ui-button</span></a>実文</div><button type="button" title="開く"><span class="ui-button-text">ui-button</span></button>`);
  expect(b).toMatchObject([{ kind: "message", text: "実文" }, { kind: "controls", controls: [{ kind: "button", label: "開く" }] }]);
});

test("panelgrid: 2 セルの行は fields(値の中の部品つき)、3 セル以上は table", () => {
  const b = blocks(`<table class="ui-panelgrid"><tr><td>氏名</td><td>テスト 太郎</td></tr><tr><td>メモ</td><td><input id="m" name="m" value="v"></td></tr></table>
    <table class="ui-panelgrid"><tr><td>a</td><td>b</td><td>c</td></tr><tr><td>1</td><td>2</td><td>3</td></tr></table>`);
  expect(kinds(b)).toEqual(["fields", "table"]);
  const rows = (b[0] as Extract<GBlock, { kind: "fields" }>).rows;
  expect(rows[0]).toMatchObject({ label: "氏名", text: "テスト 太郎", controls: [] });
  expect(rows[1]!.controls[0]).toMatchObject({ kind: "text", value: "v" });
  expect(b[1]).toMatchObject({ headers: ["a", "b", "c"], rows: [[{ text: "1" }, { text: "2" }, { text: "3" }]] });
});

test("dl は fields", () => {
  const b = blocks(`<dl><dt>項目</dt><dd>値</dd></dl>`);
  expect(b).toEqual([{ kind: "fields", rows: [{ label: "項目", text: "値", controls: [] }] }]);
});

test("th つきの表: headers と、セルの中の controls", () => {
  const b = blocks(`<table><tr><th>名</th><th>操作</th></tr><tr><td>甲</td><td><button type="button">削除</button></td></tr></table>`);
  expect(b).toMatchObject([{ kind: "table", headers: ["名", "操作"], rows: [[{ text: "甲", controls: [] }, { text: "", controls: [{ kind: "button", label: "削除" }] }]] }]);
});

test("入れ子の外枠の表は作らず、中を走査する", () => {
  const b = blocks(`<table class="outer"><tr><td><table><tr><th>x</th></tr><tr><td>1</td></tr></table></td></tr></table>`);
  expect(b).toMatchObject([{ kind: "table", headers: ["x"], rows: [[{ text: "1" }]] }]);
});

test("selectOneMenu は隠し select を使う(見た目の label・panel は読まない)", () => {
  const b = blocks(`<label for="f:s_input">学部</label><div class="ui-selectonemenu"><div class="ui-helper-hidden-accessible"><select id="f:s_input" name="f:s_input"><option value="1">文学部</option><option value="2" selected>理学部</option></select><input id="f:s_focus" readonly></div>
    <label class="ui-selectonemenu-label">理学部</label><div class="ui-selectonemenu-panel"><ul><li>文学部</li></ul></div></div>`);
  expect(b).toMatchObject([{ kind: "controls", controls: [{ kind: "select", label: "学部", value: "2", options: [{ value: "1", label: "文学部" }, { value: "2", label: "理学部" }] }] }]);
});

test("checkbox / radio は中の input が本体で、label[for] を拾う", () => {
  const b = blocks(`<div class="ui-chkbox"><div class="ui-helper-hidden-accessible"><input type="checkbox" id="c1" checked></div><div class="ui-chkbox-box"><span class="ui-icon"></span></div></div><label for="c1">通知</label>
    <input type="radio" id="r1" name="g" value="a" checked><label for="r1">甲</label><input type="radio" id="r2" name="g" value="b" disabled><label for="r2">乙</label>`);
  const cs = (b[0] as Extract<GBlock, { kind: "controls" }>).controls;
  expect(b.length).toBe(1);
  expect(cs).toMatchObject([
    { kind: "checkbox", label: "通知", checked: true },
    { kind: "radio", name: "g", value: "a", label: "甲", checked: true, disabled: false },
    { kind: "radio", value: "b", label: "乙", checked: false, disabled: true },
  ]);
});

test("タブ: onclick があれば button、無い a にも ref を付けて button", () => {
  const b = blocks(`<ul class="ui-tabs-nav"><li><a href="#t1">一</a></li><li class="ui-state-disabled"><a href="#t2" onclick="x()">二</a></li><li>三</li></ul>`);
  expect(b).toMatchObject([{ kind: "controls", controls: [{ kind: "button", label: "一" }, { kind: "button", label: "二", disabled: true }] }, { kind: "heading", text: "三" }]);
});

test("除外: hidden / rx- / ViewState / display:none / ui-helper-hidden / script / style", () => {
  const b = blocks(`<input type="hidden" name="a"><input name="rx-token" value="t"><input name="javax.faces.ViewState"><input name="v" style="display: none"><div class="ui-helper-hidden"><input name="w"></div><script>1</script><style>a{}</style><input name="ok" value="1">`);
  expect(b).toMatchObject([{ kind: "controls", controls: [{ kind: "text", value: "1" }] }]);
  expect((b[0] as Extract<GBlock, { kind: "controls" }>).controls.length).toBe(1);
});

test("ref が付き、DOM から引け、再読みしても同じ", () => {
  const d = page(`<input name="a"><button type="button">go</button>`);
  const first = parseGenericPage(d).blocks[0] as { controls: GControl[] };
  const again = parseGenericPage(d).blocks[0] as { controls: GControl[] };
  expect(first.controls.map((c) => c.ref)).toEqual(again.controls.map((c) => c.ref));
  expect(new Set(first.controls.map((c) => c.ref)).size).toBe(2);
  expect(d.querySelector(`[data-mu-ref="${first.controls[1]!.ref}"]`)?.tagName).toBe("BUTTON");
});

test("message 系のクラスと、操作部品の連続は 1 つの controls", () => {
  const b = blocks(`<div class="ui-messages"><ul><li>保存しました</li></ul></div><input type="submit" value="登録"><input type="button" value="戻る"><textarea name="t">本文</textarea>`);
  expect(b).toMatchObject([{ kind: "message", text: "保存しました" }, { kind: "controls", controls: [{ label: "登録" }, { label: "戻る" }, { kind: "textarea", value: "本文" }] }]);
});
