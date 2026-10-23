import { ParseError } from "../errors";
import type { InfoGrid, InfoPage, InfoSection, InfoTable } from "../types";

const text = (e: Element) => (e.textContent ?? "").replace(/\s+/g, " ").trim();
/** 入れ子の表の行を拾わないよう、その表に直接属する行だけ返す */
const rowsOf = (t: Element) => [...t.querySelectorAll("tr")].filter((r) => r.closest("table") === t);

function parseGrid(t: Element): InfoGrid {
  return { rows: rowsOf(t).map((r) => [...r.querySelectorAll("td.ui-panelgrid-cell")].map(text)).filter((r) => r.length > 0) };
}

function parseTable(t: Element): InfoTable | null {
  const trs = rowsOf(t);
  const head = trs.find((r) => r.querySelector("th"));
  const rows = trs.filter((r) => !r.querySelector("th") && r.querySelector("td")).map((r) => [...r.querySelectorAll("td")].map(text));
  return head && rows.length > 0 ? { headers: [...head.querySelectorAll("th")].map(text), rows } : null;
}

function parseSection(header: Element): InfoSection {
  const body = header.nextElementSibling;
  const tables = body ? [...body.querySelectorAll("table")] : [];
  return {
    title: text(header),
    grids: tables.filter((t) => t.classList.contains("ui-panelgrid")).map(parseGrid),
    // 葉(他の表を含まない)で panelgrid でない表だけ。外枠の dataStyle 表は入れ子なので除かれる
    tables: tables.filter((t) => !t.classList.contains("ui-panelgrid") && !t.querySelector("table")).flatMap((t) => parseTable(t) ?? []),
  };
}

export function parseInfoSections(root: ParentNode): InfoPage {
  const form = root.querySelector("#funcForm");
  if (!form) throw new ParseError("funcForm がありません");
  const headers = [...form.querySelectorAll(".ui-accordion-header")];
  if (headers.length === 0) throw new ParseError("アコーディオンがありません");
  return { sections: headers.map(parseSection) };
}
