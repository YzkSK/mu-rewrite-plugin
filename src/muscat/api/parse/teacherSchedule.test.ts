import { expect, test } from "bun:test";
import { ParseError } from "../errors";
import { resolveRef } from "../driver/locator";
import { pagerHtml } from "./pagerHtml";
import { parseTeacherSchedule } from "./teacherSchedule";

const CRUMB = `<ol class="ui-breadcrumb-items"><li><a href="#">教職員検索</a></li><li><span>教員スケジュール</span></li></ol>`;
const search = (title = "並び順を降順に切替ます。") =>
  `<div class="searchArea"><input id="funcForm:searchNameM4" value="麻田"><select id="funcForm:orderM4:j_id_mz:0:j_id_n1_input"><option value="sortBy.kanaName" selected>カナ氏名</option><option value="sortBy.enName">英語氏名</option></select>
  <button type="submit" title="${title}">並び順</button><button type="submit" title="並び替え項目を追加します。">追加</button>
  <button type="submit"><span> クリア </span></button><button id="funcForm:searchCommandM4" type="submit">検索</button></div>`;
const list = (rows: string, cur = "1件 (1 / 1)") =>
  `<div id="funcForm:jinjiListMd4" class="ui-datatable">${pagerHtml("funcForm:jinjiListMd4", cur)}<table><tbody class="ui-datatable-data">${rows}</tbody></table></div>`;
const trow = `<tr><td><div><a class="ui-commandlink" title="麻田　北斗(アサダ　ホクト)">麻田　北斗(アサダ　ホクト)</a></div></td><td>HOKUTO ASADA</td><td>データサイエンス学部</td></tr>`;

const doc = (form: string) => new DOMParser().parseFromString(`<div id="funcHeader">${CRUMB}</div><form id="funcForm">${form}</form>`, "text/html");

const cell = (n: number, aria: string, extra = "", events = "") =>
  `<td class="fc-daygrid-day fc-day ${extra}"><div><div class="fc-daygrid-day-top"><a class="fc-daygrid-day-number" aria-label="${aria}">${n}日</a></div><div class="fc-daygrid-day-events">${events}</div></div></td>`;
const ev = (t: string, title: string) => `<div class="fc-daygrid-event-harness"><a class="fc-event"><div class="fc-event-time">${t}</div><div class="fc-event-title">${title}</div></a></div>`;
const calendar = `<div class="teacherBaseInfoLeft"><p>教員名：麻田　北斗 </p></div><div class="fc"><div class="fc-toolbar"><h2 class="fc-toolbar-title">2026年10月</h2>
  <button class="fc-prev-button" type="button">&lt;</button><button class="fc-next-button" type="button">&gt;</button><button class="fc-today-button" type="button" disabled>今月</button></div>
  <table><tbody><tr>${cell(30, "2026年9月30日", "fc-day-other")}${cell(2, "2026年10月2日", "fc-day-fri", ev("08:50", "デザイン1") + ev("10:40", "デザイン2"))}${cell(24, "2026年10月24日", "fc-day-today")}</tr></tbody></table></div>`;

test("funcForm が無ければ ParseError", () => {
  expect(() => parseTeacherSchedule(new DOMParser().parseFromString("<p>x</p>", "text/html"))).toThrow(ParseError);
});

test("検索欄と一覧: 氏名・読み・英語名・所属、件数、並び順と戻る", () => {
  const d = doc(search() + list(trow));
  const p = parseTeacherSchedule(d);
  expect(p.calendar).toBeNull();
  expect(p.search).toMatchObject({ name: { value: "麻田" }, ascending: true });
  expect(p.search!.sort.options.map((o) => o.label)).toEqual(["カナ氏名", "英語氏名"]);
  expect(resolveRef(d, p.search!.toggleRef)?.getAttribute("title")).toContain("降順に切替");
  expect(resolveRef(d, p.search!.clearRef)?.textContent).toContain("クリア");
  expect(resolveRef(d, p.search!.searchRef)?.id).toBe("funcForm:searchCommandM4");
  expect(p.list!.pager).toMatchObject({ total: 1, page: 1, pages: 1 });
  expect(p.list!.rows[0]).toMatchObject({ name: "麻田 北斗", kana: "アサダ ホクト", english: "HOKUTO ASADA", dept: "データサイエンス学部" });
  expect(resolveRef(d, p.list!.rows[0]!.openRef)?.className).toBe("ui-commandlink");
  expect(resolveRef(d, p.backRef)?.textContent).toBe("教職員検索");
  expect(parseTeacherSchedule(doc(search("並び順を昇順に切替ます。") + list(trow))).search!.ascending).toBe(false);
});

test("0 件", () => {
  const p = parseTeacherSchedule(doc(search() + list(`<tr class="ui-datatable-empty-message"><td colspan="3">対象データがありません。</td></tr>`, "0件 (1 / 1)")));
  expect([p.list!.pager.total, p.list!.rows.length, p.list!.empty]).toEqual([0, 0, true]);
});

test("カレンダー: 教員名・月・ボタン(今月は無効なら ref なし)・マスの日付/予定/月外/今日", () => {
  const d = doc(calendar);
  const p = parseTeacherSchedule(d);
  expect([p.teacher, p.search, p.list]).toEqual(["麻田 北斗", null, null]);
  const c = p.calendar!;
  expect(c.title).toBe("2026年10月");
  expect(resolveRef(d, c.prevRef)?.className).toBe("fc-prev-button");
  expect(c.todayRef).toBe("");
  expect(c.days.map((x) => [x.day, x.date, x.other, x.today])).toEqual([[30, "2026-09-30", true, false], [2, "2026-10-02", false, false], [24, "2026-10-24", false, true]]);
  expect(c.days[1]!.events).toEqual([{ time: "08:50", title: "デザイン1" }, { time: "10:40", title: "デザイン2" }]);
});
