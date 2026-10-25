import { expect, test } from "bun:test";
import { resolveRef } from "../driver/locator";
import { ParseError } from "../errors";
import { parseSettings } from "./settings";

const tabs = (active: number) =>
  ["メール設定", "テーマ設定", "お気に入り機能設定", "ポータル表示設定"]
    .map((l, i) => `<li class="${i === active ? "ui-state-active" : ""}"><a href="#funcForm:tabArea:j_id_${i}">${l}</a></li>`)
    .join("");
const panel = (title: string, body: string) => `<div class="ui-panel"><div class="ui-panel-titlebar"><span class="ui-panel-title">${title}</span></div><div class="ui-panel-content">${body}</div></div>`;
const save = `<button type="button" onclick="PrimeFaces.confirm({message:'保存します。よろしいですか？'})"><span>保存</span></button>`;
const box = (on = false) => `<div class="ui-chkbox"><div class="ui-helper-hidden-accessible"><input type="checkbox" ${on ? "checked" : ""}></div><div class="ui-chkbox-box ${on ? "ui-state-active" : ""}"></div></div>`;
const radio = (i: number, label: string, on = false) =>
  `<div><div class="ui-radiobutton"><input id="r:${i}" type="radio" name="r" ${on ? "checked" : ""}><div class="ui-radiobutton-box"></div></div><label for="r:${i}">${label}</label></div>`;
const times = ["00:00", "06:00", "08:00", "10:30", "12:20", "14:50", "16:40", "18:30", "20:20", "22:00"];
const timeBoxes = `<table class="ui-selectmanycheckbox">${times
  .map((t, i) => `<tr><td><div class="ui-chkbox"><div><input type="checkbox" name="funcForm:tabArea:mailAddr:mailSendTimes" ${i === 2 ? "checked" : ""}></div><div class="ui-chkbox-box"></div></div><label>${t}</label></td></tr>`)
  .join("")}</table>`;
const dialogs = `<form id="headerForm"><div class="ui-confirm-dialog"><button class="ui-confirmdialog-yes">はい(ヘッダ)</button></div></form>`;
const confirm = `<div class="ui-confirm-dialog"><button class="ui-confirmdialog-yes"><span>OK</span></button></div>`;

const mail = `
  ${panel("メールアドレス設定", `
    <input id="funcForm:tabArea:mailAddr:inputMailAddr" value="">
    ${radio(1, "連絡用メールアドレス", true)}${radio(2, "任意メールアドレス")}
    <button type="button" onclick="PrimeFaces.ab({s:'x'})"><span>追加</span></button>
    <div id="funcForm:tabArea:mailAddr:mailAddrList" class="ui-datatable"><table>
      <thead><tr><th class="ui-selection-column">${box()}</th><th>メールアドレス</th><th>種類</th></tr></thead>
      <tbody class="ui-datatable-data"><tr data-rk="1"><td class="ui-selection-column">${box(true)}</td><td>a@example.com</td><td>連絡用</td></tr></tbody>
    </table></div>
    <button type="button" onclick="PrimeFaces.ab({s:'y'})"><span>選択した行を削除</span></button>
    <span>※追加ボタンをクリックすると、メールアドレスが追加されます。</span>
    ${save}`)}
  ${panel("配信時刻設定", `${timeBoxes}${save}`)}
  ${panel("配信停止設定", `
    <div class="ui-datatable"><table>
      <thead><tr><th>用途</th><th>カテゴリ</th><th>配信停止</th></tr></thead>
      <tbody class="ui-datatable-data"><tr class="ui-datatable-empty-message"><td colspan="3">対象データがありません。</td></tr></tbody>
    </table></div>${save}`)}`;

const favorite = `<select id="funcForm:tabArea:menu_input"><option value="" selected>選択してください</option><option value="m1">時間割</option></select>
  <button type="button" onclick="PrimeFaces.ab({s:'a'})"><span>追加</span></button>
  <div id="funcForm:tabArea:favoriteMenuList" class="ui-datatable"><table><thead><tr><th class="ui-selection-column"></th><th>機能</th></tr></thead>
  <tbody class="ui-datatable-data"><tr class="ui-datatable-empty-message"><td colspan="2">対象データがありません。</td></tr></tbody></table></div>
  <button type="button"><span>元に戻す</span></button>${save}`;

// 実機は SelectOneButton(ボタンの中に隠れたラジオ、文字は aria-label と span)
const button = (v: number, l: string, on = false) =>
  `<div class="ui-button ${on ? "ui-state-active" : ""}"><input id="funcForm:tabArea:portalArea:j_id_dl:${v}" name="funcForm:tabArea:portalArea:j_id_dl" type="radio" value="${v}" aria-label="${l}" ${on ? "checked" : ""}><span class="ui-button-text">${l}</span></div>`;
const portal = `<span>カレンダーの開始曜日を設定します。</span><div class="ui-selectonebutton">${button(1, "日曜日")}${button(2, "月曜日", true)}</div>${save}`;

const page = (active: number, body: string) =>
  new DOMParser().parseFromString(`${dialogs}<form id="funcForm"><div class="ui-tabs" id="funcForm:tabArea"><ul class="ui-tabs-nav">${tabs(active)}</ul><div class="ui-tabs-panels"><div class="ui-tabs-panel" id="funcForm:tabArea:j_id_${active}">${body}</div><div class="ui-tabs-panel" id="funcForm:tabArea:j_id_9"><p>※読み込み済みの別のタブ</p><button>保存</button></div></div></div></form>${confirm}`, "text/html");

test("タブ: テーマ設定とお気に入り機能設定は除き、開いているタブを示す", () => {
  const d = page(0, mail);
  const p = parseSettings(d);
  expect(p.tabs.map((t) => t.label)).toEqual(["メール設定", "ポータル表示設定"]);
  expect(p.tabs.map((t) => t.active)).toEqual([true, false]);
  expect(p.tabs.map((t) => t.loaded)).toEqual([true, false]); // 中身のあるパネルだけ読み込み済み
  expect(resolveRef(d, p.tabs[1]!.ref)?.getAttribute("href")).toBe("#funcForm:tabArea:j_id_3");
});

test("メール設定: アドレスの表・種類・追加/削除/保存、時刻、配信停止、注釈、確認の OK", () => {
  const d = page(0, mail);
  const p = parseSettings(d);
  const m = p.mail!;
  expect(m.address.table.headers).toEqual(["メールアドレス", "種類"]);
  expect(m.address.table.rows).toHaveLength(1);
  expect(m.address.table.rows[0]!.cells.map((c) => c.label)).toEqual(["a@example.com", "連絡用"]);
  expect(m.address.table.rows[0]!.select.checked).toBe(true);
  expect(m.address.kinds.map((k) => [k.label, k.checked])).toEqual([["連絡用メールアドレス", true], ["任意メールアドレス", false]]);
  expect(resolveRef(d, m.address.input.ref)?.id).toBe("funcForm:tabArea:mailAddr:inputMailAddr");
  expect(resolveRef(d, m.address.addRef)?.textContent).toContain("追加");
  expect(resolveRef(d, m.address.deleteRef)?.textContent).toContain("選択した行を削除");
  expect(m.address.notes).toEqual(["※追加ボタンをクリックすると、メールアドレスが追加されます。"]);
  expect(m.times.options.map((o) => o.label)).toEqual(times);
  expect(m.times.options.filter((o) => o.checked).map((o) => o.label)).toEqual(["08:00"]);
  expect(m.stop.table.headers).toEqual(["用途", "カテゴリ", "配信停止"]);
  expect(m.stop.table.rows).toEqual([]);
  // 保存はそれぞれの小パネルのもの
  const saves = [m.address.saveRef, m.times.saveRef, m.stop.saveRef];
  expect(new Set(saves).size).toBe(3);
  expect(saves.every((r) => resolveRef(d, r)?.getAttribute("onclick")?.includes("PrimeFaces.confirm"))).toBe(true);
  // ヘッダの確認ではなく、funcForm 外の確認の OK
  expect(resolveRef(d, p.confirmRef)?.textContent).toBe("OK");
  expect(p.favorite).toBeNull();
  expect(p.portal).toBeNull();
});

test("お気に入り機能設定", () => {
  const d = page(2, favorite);
  const f = parseSettings(d).favorite!;
  expect(f.menu.options.map((o) => o.label)).toEqual(["選択してください", "時間割"]);
  expect(f.table.rows).toEqual([]);
  expect(f.table.headers).toEqual(["機能"]);
  expect(resolveRef(d, f.addRef)?.textContent).toContain("追加");
  expect(resolveRef(d, f.resetRef)?.textContent).toContain("元に戻す");
  expect(resolveRef(d, f.saveRef)?.textContent).toContain("保存");
});

test("ポータル表示設定", () => {
  const d = page(3, portal);
  const p = parseSettings(d);
  expect(p.portal!.description).toBe("カレンダーの開始曜日を設定します。");
  expect(p.portal!.options.map((o) => [o.label, o.checked])).toEqual([["日曜日", false], ["月曜日", true]]);
  expect(resolveRef(d, p.portal!.options[0]!.ref)?.classList.contains("ui-button")).toBe(true); // 押す先はボタン
  expect(p.mail).toBeNull();
});

test("funcForm が無ければ ParseError", () => {
  expect(() => parseSettings(new DOMParser().parseFromString("<p>x</p>", "text/html"))).toThrow(ParseError);
});
