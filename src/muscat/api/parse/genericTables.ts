import type { GBlock, GCell } from "../types";
import { controlsIn, textOf } from "./genericControls";

/** その表に直接属する行(入れ子の表の行は除く) */
const rowsOf = (t: Element) => [...t.querySelectorAll("tr")].filter((r) => r.closest("table") === t);
const cellsOf = (tr: Element) => [...tr.children].filter((c) => c.tagName === "TD" || c.tagName === "TH");
const toCell = (c: Element): GCell => ({ text: textOf(c, true), controls: controlsIn(c) });

/** panelgrid: 全部の行が 2 セル以下なら項目と値、3 セル以上の行があれば 1 行目を見出しにした表 */
export function gridBlock(t: Element): GBlock | null {
  const rows = rowsOf(t).map(cellsOf).filter((r) => r.length > 0);
  if (rows.length === 0) return null;
  if (rows.some((r) => r.length >= 3)) {
    const [head = [], ...rest] = rows;
    return { kind: "table", headers: head.map((c) => textOf(c)), rows: rest.map((r) => r.map(toCell)) };
  }
  return { kind: "fields", rows: rows.map((r) => (r.length === 1 ? { label: "", ...toCell(r[0]!) } : { label: textOf(r[0]!), ...toCell(r[1]!) })) };
}

/** 普通の表: th の行が見出し、td のある行が本体 */
export function tableBlock(t: Element): GBlock | null {
  const trs = rowsOf(t);
  const head = trs.find((r) => cellsOf(r).some((c) => c.tagName === "TH"));
  const rows = trs.filter((r) => r !== head && cellsOf(r).some((c) => c.tagName === "TD")).map((r) => cellsOf(r).map(toCell));
  const headers = head ? cellsOf(head).map((c) => textOf(c)) : [];
  return headers.length === 0 && rows.length === 0 ? null : { kind: "table", headers, rows };
}

export function dlBlock(dl: Element): GBlock | null {
  const rows: { label: string; text: string; controls: GCell["controls"] }[] = [];
  let label = "";
  // dt / dd は div で包まれていることがある(実機: シラバス検索の dl.searchItem の div.searchItemRow)。この dl に属するものだけを文書順に
  for (const c of dl.querySelectorAll("dt, dd")) {
    if (c.closest("dl") !== dl) continue;
    if (c.tagName === "DT") label = textOf(c);
    else rows.push({ label, ...toCell(c) });
  }
  return rows.length > 0 ? { kind: "fields", rows } : null;
}
