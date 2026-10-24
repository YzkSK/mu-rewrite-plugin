import { expect, test } from "bun:test";
import { ParseError } from "../errors";
import { resolveRef } from "../driver/locator";
import { pagerHtml } from "./pagerHtml";
import { parseSyllabus } from "./syllabus";

const sel = (id: string, opts: [string, string][], value = "") =>
  `<select id="funcForm:${id}_input">${opts.map(([v, l]) => `<option value="${v}"${v === value ? " selected" : ""}>${l}</option>`).join("")}</select>`;
const checks = (name: string, labels: string[], on: number[] = []) =>
  `<table id="funcForm:${name}"><tr>${labels
    .map((l, i) => `<td><div class="ui-chkbox"><div><input id="funcForm:${name}:${i}" type="checkbox" name="funcForm:${name}" ${on.includes(i) ? "checked" : ""}></div><div class="ui-chkbox-box"></div></div><label>${l}</label></td>`)
    .join("")}</tr></table>`;

const row = (time: string, name: string, terms: string[]) =>
  `<tr class="ui-datatable-even"><td>${time}</td><td><a class="ui-commandlink">0010010101 ${name} [a1]</a></td><td>教員 A／教員 B</td><td><div>週間授業</div></td><td>${terms.map((t) => `<div>${t}</div>`).join("")}</td><td>2.0単位</td></tr>`;

const page = (result = "") =>
  new DOMParser().parseFromString(
    `<form id="funcForm"><button id="funcForm:create" type="submit">ふせんを貼った授業一覧</button>
    <input id="funcForm:kaikoNendo_input" value="2026">${sel("kaikoGakki", [["", "すべて対象"], ["01", "1学期"], ["02", "2学期"]], "01")}
    <input id="funcForm:jugyoKamoku"><input id="funcForm:tantoKyoin" value="山田"><input id="funcForm:keyword">
    ${sel("cgksSearchType0", [["", "すべて対象"], ["5A2", "文学部"]])}${sel("kmkbnr", [["", "すべて対象"]])}${sel("campus", [["", "すべて対象"]])}
    ${checks("gakunenList", ["学年指定なし", "1年", "2年"])}${checks("jugyoKbnList", ["週間授業"])}${checks("yobiList", ["月", "火", "水"], [1])}${checks("jigenList", ["1限"])}
    <button type="submit">表示</button><button type="submit"> クリア </button><button id="funcForm:search" type="submit">検索</button>${result}</form>`,
    "text/html",
  );

test("funcForm が無ければ ParseError", () => {
  expect(() => parseSyllabus(new DOMParser().parseFromString("<p>x</p>", "text/html"))).toThrow(ParseError);
});

test("検索前: 条件の欄(値・選択肢・チェック・ボタン)を読み、result は null", () => {
  const d = page();
  const p = parseSyllabus(d);
  expect([p.year.value, p.term.value, p.teacher.value, p.keyword.value]).toEqual(["2026", "01", "山田", ""]);
  expect(p.term.options.map((o) => o.label)).toEqual(["すべて対象", "1学期", "2学期"]);
  expect(p.dept.options).toHaveLength(2);
  expect(p.days.map((c) => [c.label, c.checked])).toEqual([["月", false], ["火", true], ["水", false]]);
  expect(p.grades.map((c) => c.label)).toEqual(["学年指定なし", "1年", "2年"]);
  expect(p.kinds).toHaveLength(1);
  expect(p.periods[0]!.label).toBe("1限");
  expect(resolveRef(d, p.days[0]!.ref)?.className).toBe("ui-chkbox-box");
  expect(resolveRef(d, p.searchRef)?.id).toBe("funcForm:search");
  expect(resolveRef(d, p.clearRef)?.textContent).toContain("クリア");
  expect(resolveRef(d, p.noteRef)?.id).toBe("funcForm:create");
  expect(p.result).toBeNull();
});

test("結果: 件数・ページ・ページャーの ref・行(コードと科目名・学期は複数行)", () => {
  const table = `<div id="funcForm:table" class="ui-datatable">${pagerHtml("funcForm:table", "406件 (1 / 41)")}
    <table><tbody class="ui-datatable-data">${row("月4", "仏教", ["2026年度 3学期", "2026年度 4学期"])}${row("火2", "統計", ["2026年度 1学期"])}</tbody></table></div>`;
  const d = page(table);
  const r = parseSyllabus(d).result!;
  expect([r.pager.total, r.pager.page, r.pager.pages, r.empty]).toEqual([406, 1, 41, false]);
  expect(r.pager.prevRef).toBe("");
  expect(resolveRef(d, r.pager.nextRef)?.className).toContain("ui-paginator-next");
  expect(r.pager.pageLinks.map((l) => [l.n, l.current])).toEqual([[1, true], [2, false]]);
  expect(r.pager.size?.options.map((o) => o.value)).toEqual(["10", "25"]);
  expect(r.rows[0]).toMatchObject({ time: "月4", code: "0010010101", title: "仏教 [a1]", teachers: "教員 A／教員 B", kind: "週間授業", terms: ["2026年度 3学期", "2026年度 4学期"], credit: "2.0単位" });
  expect(resolveRef(d, r.rows[1]!.openRef)?.textContent).toContain("統計");
});

test("0 件: 行が無く empty", () => {
  const table = `<div id="funcForm:table" class="ui-datatable">${pagerHtml("funcForm:table", "0件 (1 / 1)")}
    <table><tbody class="ui-datatable-data"><tr class="ui-datatable-empty-message"><td colspan="6">対象データがありません。</td></tr></tbody></table></div>`;
  const r = parseSyllabus(page(table)).result!;
  expect([r.pager.total, r.rows.length, r.empty]).toEqual([0, 0, true]);
});

test("ふせんを貼った授業一覧: 検索ボタンの id が違い、戻るリンクがあり、表は先頭に見出しの無い列が 1 つ多い", () => {
  const d = new DOMParser().parseFromString(
    `<div id="mainWrapTop"><a>シラバス検索</a> ふせんを貼った授業一覧</div><form id="funcForm"><input id="funcForm:kaikoNendo_input" value="2026"><button id="funcForm:j_id_2w">検索</button>` +
      `<div id="funcForm:table" class="ui-datatable"><table><thead><tr><th></th><th>曜日時限</th></tr></thead><tbody class="ui-datatable-data"><tr><td><input type="checkbox"></td><td>月1</td><td><a class="ui-commandlink">0010010101 仏教</a></td><td>教員</td><td>週間授業</td><td><div>2026年度 3学期</div></td><td>2.0単位</td></tr></tbody></table></div></form>`,
    "text/html",
  );
  const p = parseSyllabus(d);
  expect(p.mode).toBe("notes");
  expect(p.backRef).not.toBe("");
  expect(p.searchRef).not.toBe("");
  expect(p.result!.rows[0]).toMatchObject({ time: "月1", code: "0010010101", title: "仏教", teachers: "教員", credit: "2.0単位" });
});
