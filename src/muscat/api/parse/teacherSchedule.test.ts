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

const calendar = `<div class="teacherBaseInfoLeft"><p>教員名：麻田　北斗 </p></div><div id="funcForm:j_id_3x" class="kyoinSchedule"><div class="fc"></div></div>`;

test("funcForm が無ければ ParseError", () => {
  expect(() => parseTeacherSchedule(new DOMParser().parseFromString("<p>x</p>", "text/html"))).toThrow(ParseError);
});

test("検索欄と一覧: 氏名・読み・英語名・所属、件数、並び順と戻る", () => {
  const d = doc(search() + list(trow));
  const p = parseTeacherSchedule(d);
  expect(p.scheduleId).toBe("");
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

test("予定の入れ物: 教員名と id(無ければ空)", () => {
  const p = parseTeacherSchedule(doc(calendar));
  expect([p.teacher, p.search, p.list, p.scheduleId]).toEqual(["麻田 北斗", null, null, "funcForm:j_id_3x"]);
  expect(parseTeacherSchedule(doc(search() + list(trow))).scheduleId).toBe("");
});
