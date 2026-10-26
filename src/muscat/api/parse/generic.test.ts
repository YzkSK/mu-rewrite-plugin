import { expect, test } from "bun:test";
import { ParseError } from "../errors";
import type { GBlock, GInline } from "../types";
import { parseGenericPage } from "./generic";

const page = (inner: string) => new DOMParser().parseFromString(`<form id="funcForm">${inner}</form>`, "text/html");
const blocks = (inner: string) => parseGenericPage(page(inner)).blocks;
const kinds = (b: GBlock[]) => b.map((x) => x.kind);
const items = (b: GBlock | undefined) => (b as Extract<GBlock, { kind: "line" }>).items;

test("#funcForm が無ければ ParseError", () => {
  expect(() => parseGenericPage(new DOMParser().parseFromString("<p>x</p>", "text/html"))).toThrow(ParseError);
});

test("閉じた .ui-dialog の中身は出ない", () => {
  const b = blocks(`<div>本文</div><div class="ui-dialog" aria-hidden="true"><div class="ui-dialog-titlebar"><span class="ui-dialog-title">確認</span></div><div class="ui-dialog-content"><button type="button">OK</button></div></div>`);
  expect(JSON.stringify(b)).not.toContain("OK");
  expect(kinds(b)).toEqual(["line"]);
});

// 実機で「サーバー一括処理 終了通知の監視を停止しますか？」が出っぱなしになった: aria-hidden の無いダイアログは閉じている
test("aria-hidden の無い .ui-dialog も閉じているとみなす", () => {
  const b = blocks(`<div>本文</div><div class="ui-dialog"><div class="ui-dialog-titlebar"><span class="ui-dialog-title">確認</span></div><div class="ui-dialog-content"><div>監視を停止しますか？</div></div></div>`);
  expect(JSON.stringify(b)).not.toContain("監視を停止");
});

test("開いた .ui-dialog は最後の dialog ブロックになり、題名とボタンを持つ", () => {
  const b = blocks(`<div class="ui-dialog" aria-hidden="false"><div class="ui-dialog-titlebar"><span class="ui-dialog-title">確認</span></div><div class="ui-dialog-content"><div>よろしいですか</div><button type="button">OK</button></div></div><div>後ろの本文</div>`);
  expect(kinds(b)).toEqual(["line", "dialog"]);
  const d = b[1] as Extract<GBlock, { kind: "dialog" }>;
  expect(d.title).toBe("確認");
  expect(kinds(d.blocks)).toEqual(["line", "line"]);
  expect(items(d.blocks[1])).toMatchObject([{ kind: "button", label: "OK" }]);
});

test("フォームの外に移された開いたダイアログも拾い、ref を付ける。上の段・メニューのものと閉じたものは拾わない", () => {
  const dlg = (t: string, hidden: string) => `<div class="ui-dialog" aria-hidden="${hidden}"><div class="ui-dialog-titlebar"><span class="ui-dialog-title">${t}</span></div><div class="ui-dialog-content"><button type="button">OK</button></div></div>`;
  const doc = new DOMParser().parseFromString(
    `<form id="headerForm">${dlg("上の段", "false")}</form><form id="funcForm"><div>本文</div></form>${dlg("エラーがあります。", "false")}${dlg("閉じた", "true")}`,
    "text/html",
  );
  const b = parseGenericPage(doc).blocks;
  expect(kinds(b)).toEqual(["line", "dialog"]);
  const d = b[1] as Extract<GBlock, { kind: "dialog" }>;
  expect(d.title).toBe("エラーがあります。");
  expect(items(d.blocks[0])).toMatchObject([{ kind: "button", label: "OK", ref: expect.stringMatching(/^c\d+$/) }]);
});

test("見出しの level", () => {
  const b = blocks(`<h3 class="ui-accordion-header"><span class="ui-icon"></span>基本</h3><span class="ui-panel-title">パネル</span><legend class="ui-fieldset-legend">凡例</legend><h1>一</h1><h2>二</h2><h3>三</h3><h4>四</h4>`);
  expect(b).toEqual([
    { kind: "heading", text: "基本", level: 2 },
    { kind: "heading", text: "パネル", level: 3 },
    { kind: "heading", text: "凡例", level: 3 },
    { kind: "heading", text: "一", level: 1 },
    { kind: "heading", text: "二", level: 2 },
    { kind: "heading", text: "三", level: 3 },
    { kind: "heading", text: "四", level: 4 },
  ]);
});

test("文字と操作部品は 1 つの line に並ぶ", () => {
  const b = blocks(`<div><span>ラベル</span><input name="a" value="1"><button type="button">追加</button></div>`);
  expect(b.length).toBe(1);
  expect(items(b[0])).toMatchObject([{ kind: "text", text: "ラベル" }, { kind: "text", value: "1" }, { kind: "button", label: "追加", as: "button" }]);
});

test("div の境目と br で行が分かれ、同じ親の続く文字は 1 つの text", () => {
  const b = blocks(`<div><span>掲示</span> <span>2026/10/19</span> [<span>発信元</span>]</div><div><div>一</div><div>二<br>三</div></div>`);
  expect(kinds(b)).toEqual(["line", "line", "line", "line"]);
  expect(items(b[0])).toEqual([{ kind: "text", text: "掲示 2026/10/19 [ 発信元 ]" }]);
  expect(b.slice(1).map((x) => items(x))).toEqual([[{ kind: "text", text: "一" }], [{ kind: "text", text: "二" }], [{ kind: "text", text: "三" }]]);
});

test("ラジオ・チェックの label と同じ text は捨てる(text 入力の label は残す)", () => {
  const b = blocks(`<div class="ui-chkbox"><div class="ui-helper-hidden-accessible"><input type="checkbox" id="c1" checked></div><div class="ui-chkbox-box"><span class="ui-icon"></span></div></div><label for="c1">通知</label>
    <input type="radio" id="r1" name="g" value="a" checked><label for="r1">甲</label><input type="radio" id="r2" name="g" value="b" disabled><label for="r2">乙</label>
    <label for="t">氏名</label><input id="t" name="t" value="v">`);
  expect(b.length).toBe(1);
  expect(items(b[0])).toMatchObject([
    { kind: "checkbox", label: "通知", checked: true },
    { kind: "radio", name: "g", value: "a", label: "甲", checked: true, disabled: false },
    { kind: "radio", value: "b", label: "乙", checked: false, disabled: true },
    { kind: "text", text: "氏名" },
    { kind: "text", label: "氏名", value: "v" },
  ]);
});

test("table で組まれたラジオの並びは表にせず 1 行", () => {
  const b = blocks(`<table class="ui-selectoneradio"><tr><td><input type="radio" id="r1" name="g" value="a"><label for="r1">甲</label></td><td><input type="radio" id="r2" name="g" value="b"><label for="r2">乙</label></td></tr></table>`);
  expect(kinds(b)).toEqual(["line"]);
  expect(items(b[0]).length).toBe(2);
});

test("a.ui-commandlink / a[onclick] は link、button / input[type=submit] は button", () => {
  const b = blocks(`<a class="ui-commandlink" href="#">タイトル</a><a href="#" onclick="x()">開く</a><button type="button">ボタン</button><input type="submit" value="登録">`);
  expect(items(b[0]).map((i) => (i as { as: string }).as)).toEqual(["link", "link", "button", "button"]);
});

test("アイコンだけのボタンの label は title、無ければ •", () => {
  const b = blocks(`<button type="button" title="開く"><span class="ui-button-text">ui-button</span></button><button type="button"><span class="ui-icon"></span></button><a class="ui-button" href="#"><span class="ui-button-text">ui-button</span></a>実文`);
  expect(items(b[0])).toMatchObject([{ kind: "button", label: "開く" }, { kind: "button", label: "•" }, { kind: "text", text: "実文" }]);
});

test("空の div / span は行にならない", () => {
  expect(blocks(`<div>  </div><span> </span><div><span></span><div class="ui-panel">\n</div></div><div>文</div>`)).toEqual([{ kind: "line", items: [{ kind: "text", text: "文" }] }]);
});

test("message 系は notice の line", () => {
  const b = blocks(`<div class="ui-messages"><ul><li>保存しました</li></ul></div><div class="ui-message"></div>`);
  expect(b).toEqual([{ kind: "line", items: [{ kind: "text", text: "保存しました" }], tone: "notice" }]);
});

const TABS = `<div class="ui-tabs"><ul class="ui-tabs-nav"><li><a href="#t1">一</a></li><li class="ui-tabs-selected"><a href="#t2">二</a></li><li>飾り</li></ul>
  <div class="ui-tabs-panels"><div class="ui-tabs-panel"><div>パネル一</div></div><div class="ui-tabs-panel"><div>パネル二</div></div></div></div>`;

test("タブは 1 つの tabs ブロックで、選択中のパネルだけ読む", () => {
  const b = blocks(TABS);
  expect(b).toMatchObject([{ kind: "tabs", tabs: [{ label: "一", selected: false }, { label: "二", selected: true }] }, { kind: "line", items: [{ text: "パネル二" }] }]);
  const ref = (b[0] as Extract<GBlock, { kind: "tabs" }>).tabs[1]!.ref;
  expect(ref).toMatch(/^c\d+$/);
});

test("元のページで無効(ui-state-disabled)なタブは disabled", () => {
  const b = blocks(TABS.replace('<li><a href="#t1">', '<li class="ui-state-disabled"><a href="#t1">'));
  expect(b[0]).toMatchObject({ kind: "tabs", tabs: [{ label: "一", disabled: true }, { label: "二", disabled: false }] });
});

test("選択中が分からなければ最初のパネル", () => {
  const b = blocks(TABS.replace("ui-tabs-selected", ""));
  expect(b.length).toBe(2);
  expect(b[1]).toMatchObject({ kind: "line", items: [{ text: "パネル一" }] });
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

// 実機の確認(シラバス検索): dt / dd が div.searchItemRow で包まれていて dl の直下に無く、検索条件の入力欄がすべて捨てられていた
test("dt / dd が div で包まれた dl も fields になる(入力欄が捨てられない)", () => {
  const b = blocks(`<dl class="searchItem"><div class="searchItemRow"><dt>授業科目</dt><dd><input type="text" name="funcForm:k"></dd></div><div class="searchItemRow"><dt>担当</dt><dd><input type="text" name="funcForm:t"></dd></div></dl>`);
  expect(kinds(b)).toEqual(["fields"]);
  const f = b[0] as Extract<GBlock, { kind: "fields" }>;
  expect(f.rows.map((r) => r.label)).toEqual(["授業科目", "担当"]);
  expect(f.rows.every((r) => r.controls.length === 1 && r.controls[0]!.kind === "text")).toBe(true);
});

test("fields にできない dl / 表は、捨てずに中身を読む", () => {
  const b = blocks(`<dl><div><input type="text" name="funcForm:a"><button type="button">ボタン</button></div></dl><table><tr><td><input type="text" name="funcForm:b"></td></tr></table>`);
  const all = b.flatMap((x) => (x.kind === "line" ? x.items.filter((i) => "ref" in i) : []));
  expect(all.map((c) => c.kind)).toEqual(expect.arrayContaining(["text", "button"]));
});

test("dl は fields、th つきの表は table、入れ子の外枠の表は作らない", () => {
  expect(blocks(`<dl><dt>項目</dt><dd>値</dd></dl>`)).toEqual([{ kind: "fields", rows: [{ label: "項目", text: "値", controls: [] }] }]);
  expect(blocks(`<table><tr><th>名</th><th>操作</th></tr><tr><td>甲</td><td><button type="button">削除</button></td></tr></table>`)).toMatchObject([
    { kind: "table", headers: ["名", "操作"], rows: [[{ text: "甲", controls: [] }, { text: "", controls: [{ kind: "button", label: "削除" }] }]] },
  ]);
  expect(blocks(`<table><tr><td><table><tr><th>x</th></tr><tr><td>1</td></tr></table></td></tr></table>`)).toMatchObject([{ kind: "table", headers: ["x"], rows: [[{ text: "1" }]] }]);
});

test("selectOneMenu は隠し select を使う(見た目の label・panel は読まない)", () => {
  const b = blocks(`<label for="f:s_input">学部</label><div class="ui-selectonemenu"><div class="ui-helper-hidden-accessible"><select id="f:s_input" name="f:s_input"><option value="1">文学部</option><option value="2" selected>理学部</option></select><input id="f:s_focus" readonly></div>
    <label class="ui-selectonemenu-label">理学部</label><div class="ui-selectonemenu-panel"><ul><li>文学部</li></ul></div></div>`);
  expect(items(b[0]) as GInline[]).toMatchObject([{ kind: "text", text: "学部" }, { kind: "select", label: "学部", value: "2", options: [{ value: "1", label: "文学部" }, { value: "2", label: "理学部" }] }]);
  expect(b.length).toBe(1);
});

test("除外: hidden / rx- / ViewState / display:none / ui-helper-hidden / script / style", () => {
  const b = blocks(`<input type="hidden" name="a"><input name="rx-token" value="t"><input name="javax.faces.ViewState"><input name="v" style="display: none"><div class="ui-helper-hidden"><input name="w"></div><script>1</script><style>a{}</style><input name="ok" value="1">`);
  expect(b).toMatchObject([{ kind: "line", items: [{ kind: "text", value: "1" }] }]);
  expect(items(b[0]).length).toBe(1);
});

test("ref が付き、DOM から引け、再読みしても同じ", () => {
  const d = page(`<input name="a"><button type="button">go</button>`);
  const first = items(parseGenericPage(d).blocks[0]) as { ref: string }[];
  const again = items(parseGenericPage(d).blocks[0]) as { ref: string }[];
  expect(first.map((c) => c.ref)).toEqual(again.map((c) => c.ref));
  expect(new Set(first.map((c) => c.ref)).size).toBe(2);
  expect(d.querySelector(`[data-mu-ref="${first[1]!.ref}"]`)?.tagName).toBe("BUTTON");
});
