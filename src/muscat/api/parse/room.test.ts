import { expect, test } from "bun:test";
import { resolveRef } from "../driver/locator";
import { ParseError } from "../errors";
import { parseRoom } from "./room";

const sel = (id: string, opts: [string, string][], value = "") =>
  `<select id="funcForm:${id}_input">${opts.map(([v, l]) => `<option value="${v}"${v === value ? " selected" : ""}>${l}</option>`).join("")}</select>`;
const checks = (id: string, labels: string[], on: number[] = []) =>
  `<table id="funcForm:${id}" class="ui-selectmanycheckbox"><tr>${labels
    .map((l, i) => `<td><div class="ui-chkbox"><div><input id="funcForm:${id}:${i}" type="checkbox" name="funcForm:${id}" ${on.includes(i) ? "checked" : ""}></div><div class="ui-chkbox-box"></div></div><label>${l}</label></td>`)
    .join("")}</tr></table>`;
const radio = (i: number, label: string, on = false) =>
  `<div><div class="ui-radiobutton"><input id="funcForm:cap:${i}" type="radio" name="funcForm:cap" ${on ? "checked" : ""}><div class="ui-radiobutton-box"></div></div><label for="funcForm:cap:${i}">${label}</label></div>`;
const text = (id: string, v = "") => `<input id="funcForm:${id}" value="${v}">`;

const LEGEND = ["Jugyo:授業", "Hokou:補講授業", "ResOther:他ユーザ予約"].map((s) => s.split(":") as [string, string]);
const legend = `<div>${LEGEND.map(([k, l]) => `<div><span class="exampleRoomStatus zone${k}"></span>${l}</div>`).join("")}<div class="dispNone"><span class="exampleRoomStatus zoneTest"></span>試験</div></div>`;
const bar = (cls: string, style: string, t: string) => `<div><a class="timezone zone${cls} clsSubTableArea" title="${t}" style="${style}">${t}</a></div>`;
const cells = (at: Record<number, string>) => Array.from({ length: 32 }, (_, i) => `<td class="halfHourEven">${at[i] ?? ""}</td>`).join("");
const room = (name: string, at: Record<number, string>) =>
  `<tr><td><div class="kstNameArea">${name}<button class="roomInfoBtn"><span>ui-button</span></button></div></td><td><button>表示</button></td>${cells(at)}</tr>`;
const hours = Array.from({ length: 16 }, (_, i) => `<th>${8 + i}:00</th>`).join("");

const result = `<div id="funcForm:yoyakuArea">${legend}
  <div><select id="funcForm:targetDate_input"><option value="index_1" selected>2026/10/24</option><option value="index_2">2026/10/25</option></select>
  <button type="submit"><span>指定日へ移動</span></button><button id="funcForm:nextBtn">前へ</button><button id="funcForm:forwardBtn">次へ</button></div>
  <table><thead><tr><th>教室名</th><th>月間</th>${hours}<th></th></tr></thead><tbody class="ui-datatable-data">
  <tr class="reserveDate"><td><span>2026/10/24(土)</span></td><td></td></tr>
  ${room("テスト１－１Ａ", { 10: bar("Jugyo", "left: 9px;width: 100px;top: 0px", "13:10～14:50 土3 授業 A"), 0: bar("ResOther", "left: -1px;width: 960px;top: 0px", "00:00～24:00 予約 B") })}
  ${room("テスト１－２Ｂ", { 4: bar("Jugyo", "left: 9px;width: 100px;top: 0px", "授業 C") + bar("Hokou", "left: 9px;width: 100px;top: 30px", "補講 D") })}
  </tbody></table></div>`;

const page = (body: string) => new DOMParser().parseFromString(`<form id="funcForm">${body}</form>`, "text/html");
const cond = `${checks("hyojiTaisho", ["本人の予約", "職員の予約"], [1])}${text("targetDateFrom:targetDateFrom_input", "2026/10/24")}${text("targetDateTo:targetDateTo_input", "2026/10/25")}
  <div id="funcForm:akiRow"><span>空き教室</span><div id="funcForm:j_id_9z" class="ui-chkbox"><input type="checkbox" id="funcForm:j_id_9z_input"><div class="ui-chkbox-box"></div></div>
  ${text("targetTimeFrom:time")}${text("targetTimeTo:time")}${text("freeHour")}${text("freeMinute")}</div>${checks("j_id_4a", ["月", "火", "水"], [0])}
  ${sel("campus", [["", "すべて対象"], ["1", "有明キャンパス"]])}${sel("building", [["", "すべて対象"], ["A1", "有明１号館"]])}${sel("kai", [["", "すべて対象"], ["1", "1階"]])}
  ${text("shuyoNinzuHeijoFrom")}${text("shuyoNinzuHeijoTo", "50")}${text("shuyoNinzuShikenFrom")}${text("shuyoNinzuShikenTo")}${text("shuyoNinzuNyushiFrom")}${text("shuyoNinzuNyushiTo")}
  ${radio(0, "一覧に列を表示しない", true)}${radio(1, "一覧に列を表示する")}${sel("shuyoNinzu2", [["1", "平常時"], ["2", "試験時"]], "1")}
  <button type="submit">選択</button><button type="submit">クリア</button><button id="funcForm:output" type="submit">教室利用状況表出力</button><button type="submit"> クリア </button><button id="funcForm:search" type="submit">検索</button>`;

test("funcForm が無ければ ParseError", () => {
  expect(() => parseRoom(new DOMParser().parseFromString("<p>x</p>", "text/html"))).toThrow(ParseError);
});

test("検索前: 条件の欄(値・選択肢・チェック・スイッチ・ラジオ・ボタン)を読み、result は null", () => {
  const d = page(cond);
  const p = parseRoom(d);
  expect(p.result).toBeNull();
  expect([p.period.from.value, p.period.to.value, p.capacity.regular.to.value]).toEqual(["2026/10/24", "2026/10/25", "50"]);
  expect(p.targets.map((c) => [c.label, c.checked])).toEqual([["本人の予約", false], ["職員の予約", true]]);
  expect(p.days.map((c) => [c.label, c.checked])).toEqual([["月", true], ["火", false], ["水", false]]);
  expect(p.free).toMatchObject({ on: false });
  expect(resolveRef(d, p.free!.boxRef)?.className).toContain("ui-chkbox-box");
  expect(p.campus.options.map((o) => o.label)).toEqual(["すべて対象", "有明キャンパス"]);
  expect([p.building.options.length, p.floor.options.length, p.capacityKind.value]).toEqual([2, 2, "1"]);
  expect(p.showCapacity.map((c) => [c.label, c.checked])).toEqual([["一覧に列を表示しない", true], ["一覧に列を表示する", false]]);
  expect(resolveRef(d, p.showCapacity[1]!.ref)?.className).toContain("ui-radiobutton-box");
  expect(resolveRef(d, p.searchRef)?.id).toBe("funcForm:search");
  // 主のクリアは、2 つあるうちの最後(出力ボタンの後ろ)
  expect(resolveRef(d, p.clearRef)?.textContent).toBe(" クリア ");
});

test("タイムライン: 教室・予約の位置(分)・種類・段・凡例・日付の移動", () => {
  const d = page(cond + result);
  const r = parseRoom(d).result!;
  expect(r).toMatchObject({ date: "2026/10/24(土)", from: 480, to: 1440 });
  expect(r.dates.options.map((o) => o.label)).toEqual(["2026/10/24", "2026/10/25"]);
  expect(resolveRef(d, r.prevRef)?.id).toBe("funcForm:nextBtn");
  expect(resolveRef(d, r.nextRef)?.id).toBe("funcForm:forwardBtn");
  expect(resolveRef(d, r.moveRef)?.textContent).toContain("指定日へ移動");
  // 見えている種類だけ(dispNone の試験は出さない)
  expect(r.legend).toEqual([{ kind: "jugyo", label: "授業" }, { kind: "hokou", label: "補講授業" }, { kind: "resOther", label: "他ユーザ予約" }]);
  expect(r.rooms.map((x) => x.name)).toEqual(["テスト１－１Ａ", "テスト１－２Ｂ"]);
  const [a, b] = r.rooms;
  // マス 10(半時間 × 10 = 13:00)+ left 9 + 1 = 13:10、width 100 分
  expect(a!.bars.map((x) => [x.kind, x.start, x.end, x.lane])).toEqual([["resOther", 480, 1440, 0], ["jugyo", 790, 890, 0]]);
  expect(a!.bars[1]).toMatchObject({ text: "13:10～14:50 土3 授業 A" });
  expect(resolveRef(d, a!.bars[1]!.openRef)?.className).toContain("zoneJugyo");
  expect(resolveRef(d, a!.infoRef)?.className).toContain("roomInfoBtn");
  expect(b!.bars.map((x) => [x.kind, x.lane])).toEqual([["jugyo", 0], ["hokou", 1]]);
});

test("収容人数の列が出ていれば、行の値を読む(列の位置は見出しから)", () => {
  const d = page(
    cond + `<div id="funcForm:yoyakuArea"><table><thead><tr><th>教室名</th><th>収容人数</th><th>月間</th><th>8:00</th></tr></thead><tbody class="ui-datatable-data">
    <tr><td><div class="kstNameArea">教室<button></button></div></td><td>120</td><td></td><td>${bar("Jugyo", "left: 9px;width: 60px;top: 0px", "x")}</td></tr></tbody></table></div>`,
  );
  const r = parseRoom(d).result!;
  expect(r.rooms[0]).toMatchObject({ name: "教室", capacity: "120" });
  expect(r.rooms[0]!.bars[0]).toMatchObject({ start: 490, end: 550 });
});
