import type { ListPager } from "../types";
import { squash } from "./genericControls";
import { refOf, selectField } from "./liveFields";

const COUNT = /(\d+)\s*件\s*\(\s*(\d+)\s*\/\s*(\d+)\s*\)/;

/**
 * PrimeFaces の p:dataTable(上のページャーと本体の行)を読む。件数は「N件 (p/q)」。
 * 副作用: ページャーのリンクと件数の select に data-mu-ref を付ける
 */
export function parseDataTable(table: Element | null): { pager: ListPager; rows: Element[] } | null {
  if (!table) return null;
  const top = table.querySelector(".ui-paginator-top") ?? table.querySelector(".ui-paginator");
  const m = COUNT.exec(squash(top?.querySelector(".ui-paginator-current")?.textContent));
  const link = (cls: string) => {
    const a = top?.querySelector(`.${cls}`);
    return a && !a.classList.contains("ui-state-disabled") ? refOf(a) : "";
  };
  const pageLinks = [...(top?.querySelectorAll(".ui-paginator-page") ?? [])].map((a) => ({
    n: Number(squash(a.textContent)),
    ref: refOf(a),
    current: a.classList.contains("ui-state-active"),
  }));
  const size = top?.querySelector(".ui-paginator-rpp-options");
  const pager: ListPager = {
    total: m ? Number(m[1]) : 0,
    page: m ? Number(m[2]) : 1,
    pages: m ? Number(m[3]) : 1,
    pageLinks,
    firstRef: link("ui-paginator-first"),
    prevRef: link("ui-paginator-prev"),
    nextRef: link("ui-paginator-next"),
    lastRef: link("ui-paginator-last"),
    size: size ? selectField(size) : null,
  };
  const rows = [...table.querySelectorAll("tbody.ui-datatable-data > tr")].filter((tr) => !tr.classList.contains("ui-datatable-empty-message"));
  return { pager, rows };
}
