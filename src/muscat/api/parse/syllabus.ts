import { ParseError } from "../errors";
import type { SyllabusPage, SyllabusRow } from "../types";
import { squash } from "./genericControls";
import { parseDataTable } from "./dataTable";
import { buttonByText, checkOptions, refOf, selectField, textField } from "./liveFields";
import { parseSyllabusDetail } from "./syllabusDetail";

/** skip: 先頭の余分な列の数(ふせん一覧は先頭に見出しの無い列が 1 つ多い) */
function parseRow(tr: Element, skip = 0): SyllabusRow {
  const td = [...tr.children].slice(skip);
  const a = td[1]?.querySelector("a");
  const full = squash(td[1]?.textContent);
  const m = /^(\S+)\s+(.+)$/.exec(full);
  const terms = [...(td[4]?.querySelectorAll("div") ?? [])].map((d) => squash(d.textContent)).filter(Boolean);
  return {
    time: squash(td[0]?.textContent),
    code: m ? m[1]! : "",
    title: m ? m[2]! : full,
    teachers: squash(td[2]?.textContent),
    kind: squash(td[3]?.textContent),
    terms: terms.length ? terms : [squash(td[4]?.textContent)].filter(Boolean),
    credit: squash(td[5]?.textContent),
    openRef: refOf(a),
  };
}

/**
 * シラバス検索(#funcForm)。条件の欄と、検索したあとの一覧。
 * 副作用: 操作する要素に data-mu-ref を付ける
 */
export function parseSyllabus(root: Document): SyllabusPage {
  const form = root.getElementById("funcForm");
  if (!form) throw new ParseError("funcForm がありません");
  const id = (s: string) => root.getElementById(`funcForm:${s}`);
  const table = parseDataTable(id("table"));
  // 「ふせんを貼った授業一覧」は同じ画面コードで、検索ボタンの id が違い、上の見出しに「シラバス検索」へ戻るリンクがある(実機で確認)
  const notes = !id("search");
  const th = id("table")?.querySelector("thead th");
  const skip = th && squash(th.textContent) === "" ? 1 : 0;
  const back = [...(root.getElementById("mainWrapTop")?.querySelectorAll("a") ?? [])].find((a) => squash(a.textContent) === "シラバス検索");
  return {
    mode: notes ? "notes" : "search",
    backRef: refOf(back),
    year: textField(id("kaikoNendo_input")),
    term: selectField(id("kaikoGakki_input")),
    subject: textField(id("jugyoKamoku")),
    teacher: textField(id("tantoKyoin")),
    keyword: textField(id("keyword")),
    dept: selectField(id("cgksSearchType0_input")),
    category: selectField(id("kmkbnr_input")),
    campus: selectField(id("campus_input")),
    days: checkOptions(form, "funcForm:yobiList"),
    grades: checkOptions(form, "funcForm:gakunenList"),
    kinds: checkOptions(form, "funcForm:jugyoKbnList"),
    periods: checkOptions(form, "funcForm:jigenList"),
    searchRef: refOf(id("search") ?? buttonByText(form, "検索")),
    clearRef: refOf(buttonByText(form, "クリア")),
    noteRef: refOf(id("create")),
    result: table && { pager: table.pager, rows: table.rows.map((tr) => parseRow(tr, skip)), empty: table.rows.length === 0 },
    detail: parseSyllabusDetail(root),
  };
}
