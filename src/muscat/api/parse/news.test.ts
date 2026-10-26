import { expect, test } from "bun:test";
import { ParseError } from "../errors";
import { resolveRef } from "../driver/locator";
import { parseNews } from "./news";

const NAMES = ["グループ", "全表示", "授業", "時間割変更", "既読", "未読", "新着", "重要", "申込", "フラグつき"];
const HIDE = 'style="display:none"';

const row = (o: { title: string; cat?: string; imp?: boolean; neu?: boolean; flag?: string; read?: string; meta?: string }) =>
  `<div class="alignRight"><dl class="textOf">
    <i class="fa fa-exclamation-circle" ${o.imp ? "" : HIDE}></i><i class="fa fa-lightbulb-o" ${o.neu ? "" : HIDE}></i>
    <span class="keijiCategory">${o.cat ?? "授業"}</span><a class="ui-commandlink" href="#">${o.title}</a>${o.meta ?? " [テスト部署] 2026/10/12"}</dl>
    <span class="inlineBlock"><div class="ui-selectbooleanbutton">${o.flag ?? "フラグをつける"}</div><div class="ui-selectbooleanbutton">${o.read ?? "既読にする"}</div></span></div>`;
const OPS = `<div class="alignRight"><button type="button">すべて既読にする</button><button type="button">更新</button></div>`;

const page = (panels: string[], selected = 1, extra = "", dialog = "") =>
  new DOMParser().parseFromString(
    `<div id="funcContent"><form id="funcForm"><input name="funcForm:keyword" value="kw"><input name="funcForm:jugyoKamoku" value="co"><button id="funcForm:search">検索</button></form>
    <div id="funcForm:tabArea" class="ui-tabs"><ul class="ui-tabs-nav">${NAMES.map((n, i) => `<li class="${i === selected ? "ui-tabs-selected" : ""}"><a href="#t${i}">${n}</a></li>`).join("")}</ul>
    <div class="ui-tabs-panels">${NAMES.map((_, i) => `<div class="ui-tabs-panel">${panels[i] ?? ""}</div>`).join("")}</div></div>${extra}</div>${dialog}`,
    "text/html",
  );

test("#funcContent が無ければ ParseError", () => {
  expect(() => parseNews(new DOMParser().parseFromString("<p>x</p>", "text/html"))).toThrow(ParseError);
});

test("タブ・検索欄・選択中のパネルの平らな一覧と、操作の行は行にしない", () => {
  const d = page([`<div class="ui-accordion"></div>`, OPS + row({ title: "件名A" }) + row({ title: "件名B" })]);
  const p = parseNews(d);
  expect(p.tabs.map((t) => t.name)).toEqual(NAMES);
  expect(p.tabs.filter((t) => t.selected).map((t) => t.name)).toEqual(["全表示"]);
  expect(resolveRef(d, p.tabs[2]!.ref)?.textContent).toBe("授業");
  expect([p.keyword, p.course]).toEqual(["kw", "co"]);
  expect(resolveRef(d, p.searchRef)?.id).toBe("funcForm:search");
  expect(resolveRef(d, p.keywordRef)).toBe(d.querySelector('[name="funcForm:keyword"]'));
  expect(p.groups).toBeNull();
  expect(p.items.map((i) => i.title)).toEqual(["件名A", "件名B"]);
  expect(p.empty).toBe(false);
  expect(p.detail).toBeNull();
});

// 実機の確認: 旧版(muscat.js)の整形が先に動いていると、`[発信元] 2026/10/12` の文字は span.mu-from / span.mu-date(MM/DD)に作り替えられている
test("旧版が作り替えた発信元・日付(span.mu-from / span.mu-date)も読める", () => {
  const d = page(["", row({ title: "a", meta: `<span class="mu-from">テスト部署</span><span class="mu-date">10/12</span>` })]);
  expect(parseNews(d).items[0]).toMatchObject({ source: "テスト部署", date: "10/12" });
});

test("行の各項目: 分類・発信元・日付・アイコン・既読/フラグの文言・ref", () => {
  const d = page(["", row({ title: "a", imp: true, cat: "分類X" }) + row({ title: "b", neu: true, flag: "フラグを外す", read: "未読にする" }) + row({ title: "c", imp: true, neu: true, meta: "" })]);
  const items = parseNews(d).items;
  expect(items[0]).toMatchObject({ title: "a", category: "分類X", source: "テスト部署", date: "2026/10/12", important: true, isNew: false, unread: true, flagged: false });
  expect(items[1]).toMatchObject({ important: false, isNew: true, unread: false, flagged: true });
  expect(items[2]).toMatchObject({ important: true, isNew: true, source: "", date: "" });
  expect(resolveRef(d, items[0]!.openRef)?.textContent).toBe("a");
  expect(resolveRef(d, items[0]!.flagRef)?.textContent).toBe("フラグをつける");
  expect(resolveRef(d, items[0]!.readRef)?.textContent).toBe("既読にする");
});

const head = (title: string, desc = "") =>
  `<h3 class="ui-accordion-header"><table class="tabWidth"><tr><td class="tabTitle">${title}</td><td class="tabTitleSetumei">${desc}</td><td class="tabTitleKensu"></td></tr></table></h3>`;
const GROUP_OPS = `<div class="squeezeArea"><button type="button">表示</button><span class="floatRight"><div class="alignRight"><button type="button">更新</button></div></span></div>`;

test("グループ: 見出しの題名と説明、行、更新・すべて表示する。items は全部つないだもの", () => {
  const acc = `<div class="ui-accordion">${head("授業関連", "授業に関してのお知らせです。")}<div class="ui-accordion-content">${GROUP_OPS}<div class="ui-scrollpanel">${row({ title: "g1" })}${row({ title: "g2" })}</div><button type="button">すべて表示する</button></div>
    ${head("その他")}<div class="ui-accordion-content">${GROUP_OPS}${row({ title: "g3" })}</div></div>`;
  const d = page([acc], 0);
  const p = parseNews(d);
  expect(p.groups!.map((g) => [g.title, g.description, g.items.map((i) => i.title)])).toEqual([["授業関連", "授業に関してのお知らせです。", ["g1", "g2"]], ["その他", "", ["g3"]]]);
  const [a, b] = p.groups!;
  expect(resolveRef(d, a!.updateRef)?.textContent).toBe("更新");
  expect(resolveRef(d, a!.moreRef)?.textContent).toBe("すべて表示する");
  expect(b!.moreRef).toBe("");
  // 行の更新は、同じグループの更新ボタン
  expect(a!.items.map((i) => i.updateRef)).toEqual([a!.updateRef, a!.updateRef]);
  expect(b!.items[0]!.updateRef).toBe(b!.updateRef);
  expect(b!.updateRef).not.toBe(a!.updateRef);
  expect(p.items.map((i) => i.title)).toEqual(["g1", "g2", "g3"]);
});

test("グループでないパネルの行の更新は、同じパネルの「更新」ボタン", () => {
  const d = page(["", OPS + row({ title: "A" })]);
  const p = parseNews(d);
  expect(resolveRef(d, p.items[0]!.updateRef)?.textContent).toBe("更新");
  expect(parseNews(page(["", row({ title: "A" })])).items[0]!.updateRef).toBe("");
});

test("確認ダイアログの OK は body 直下のもの。#headerForm の中のものは使わない。無ければ空", () => {
  const yes = `<button class="ui-confirmdialog-yes">OK</button>`;
  const d = page([], 1, "", `<form id="headerForm"><div class="ui-confirm-dialog">${yes}</div></form><div class="ui-confirm-dialog">${yes.replace("OK", "OK2")}</div>`);
  const p = parseNews(d);
  expect(resolveRef(d, p.confirmYesRef)?.textContent).toBe("OK2");
  expect(parseNews(page([], 1, "", `<form id="headerForm">${yes}</form>`)).confirmYesRef).toBe("");
});

test("データなし: 行が 0 で文言があれば empty", () => {
  expect(parseNews(page([], 1)).empty).toBe(false);
  expect(parseNews(page(["", "出力対象のデータが存在しません。"], 1)).empty).toBe(true);
});

const dialog = (hidden: string, style = "") => `<div id="bsd00702:dialog" class="ui-dialog" aria-hidden="${hidden}" style="${style}"><a class="ui-dialog-titlebar-close" href="#"></a>
  <button title="前の掲示情報を表示">前</button><button title="次の掲示情報を表示">次</button><button title="印刷">印刷</button><div class="ui-selectbooleanbutton">フラグを外す</div>
  <table class="ui-panelgrid singleTable"><tr><td class="ui-panelgrid-cell ui-widget-header"><label class="ui-outputlabel"><span class="ui-outputlabel-label">件名</span></label></td><td class="ui-panelgrid-cell">詳細の件名</td></tr>
  <tr><td class="ui-panelgrid-cell ui-widget-header"><label class="ui-outputlabel"><span class="ui-outputlabel-label">本文</span></label></td><td class="ui-panelgrid-cell"><div class="fr-box fr-view"><p>本文 <a href="https://example.com">リンク</a></p></div></td></tr>
  <tr><td class="ui-panelgrid-cell ui-widget-header"><label class="ui-outputlabel"><span class="ui-outputlabel-label">添付ファイル</span></label></td><td class="ui-panelgrid-cell">file.pdf</td></tr></table></div>`;

// 拡張が元の画面を隠すので、開いていても display は none になる。aria-hidden で判断する(実機で確認)
test("詳細ダイアログ: aria-hidden=false なら(display が none でも)項目名と値・html・ボタンの ref、true なら null", () => {
  const d = page([], 1, "", dialog("false", "display:none"));
  const det = parseNews(d).detail!;
  expect(det.title).toBe("詳細の件名");
  expect(det.fields.map((f) => f.label)).toEqual(["件名", "本文", "添付ファイル"]);
  expect(det.fields[1]).toMatchObject({ text: "本文 リンク", html: '<p>本文 <a href="https://example.com">リンク</a></p>' });
  expect(det.flagged).toBe(true);
  expect(resolveRef(d, det.prevRef)?.getAttribute("title")).toContain("前の");
  expect(resolveRef(d, det.nextRef)?.getAttribute("title")).toContain("次の");
  expect(resolveRef(d, det.closeRef)?.className).toBe("ui-dialog-titlebar-close");
  expect(parseNews(page([], 1, "", dialog("true", "display:block"))).detail).toBeNull();
  // ✕ のあと、aria-hidden は false のまま中身だけ消える
  expect(parseNews(page([], 1, "", `<div id="bsd00702:dialog" class="ui-dialog" aria-hidden="false"><table class="ui-panelgrid singleTable"></table></div>`)).detail).toBeNull();
});
