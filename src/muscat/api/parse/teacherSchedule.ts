import { ParseError } from "../errors";
import type { TeacherRow, TeacherSchedulePage, TeacherSearch } from "../types";
import { squash } from "./genericControls";
import { parseDataTable } from "./dataTable";
import { buttonByText, refOf, selectField, textField } from "./liveFields";

function parseRow(tr: Element): TeacherRow {
  const td = [...tr.children];
  const a = td[0]?.querySelector("a");
  const full = squash(a?.textContent ?? td[0]?.textContent);
  const m = /^(.*?)\s*\((.*)\)$/.exec(full);
  return { name: m ? m[1]! : full, kana: m ? m[2]! : "", english: squash(td[1]?.textContent), dept: squash(td[2]?.textContent), openRef: refOf(a) };
}

function parseSearch(root: Document, form: Element): TeacherSearch | null {
  const name = root.getElementById("funcForm:searchNameM4");
  if (!name) return null;
  const toggle = form.querySelector('button[title*="並び順を"][title*="切替"]');
  return {
    name: textField(name),
    sort: selectField(form.querySelector('select[id^="funcForm:orderM4"][id$="_input"]')),
    ascending: !!toggle && !toggle.getAttribute("title")?.includes("昇順"),
    toggleRef: refOf(toggle),
    clearRef: refOf(buttonByText(form, "クリア")),
    searchRef: refOf(root.getElementById("funcForm:searchCommandM4")),
  };
}

/**
 * 教員スケジュール(#funcForm)。検索欄・教員の一覧・選んだ教員の予定の入れ物のうち、いま出ているものを読む。
 * 「検索に戻る」は枠(#funcHeader)のパンくず。副作用: 操作する要素に data-mu-ref を付ける
 */
export function parseTeacherSchedule(root: Document): TeacherSchedulePage {
  const form = root.getElementById("funcForm");
  if (!form) throw new ParseError("funcForm がありません");
  const table = parseDataTable(root.getElementById("funcForm:jinjiListMd4"));
  const back = [...root.querySelectorAll(".ui-breadcrumb-items a")].find((a) => squash(a.textContent) === "教職員検索");
  return {
    teacher: squash(form.querySelector(".teacherBaseInfoLeft p")?.textContent).replace(/^教員名[:：]\s*/, ""),
    search: parseSearch(root, form),
    list: table && { pager: table.pager, rows: table.rows.map(parseRow), empty: table.rows.length === 0 },
    scheduleId: form.querySelector(".kyoinSchedule")?.id ?? "",
    backRef: refOf(back),
  };
}
