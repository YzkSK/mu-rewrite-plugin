import { scanWidgets } from "./widgets";

/** DataTable のページ送り・件数変更の要求(first は先頭の行の番号、rows は 1 ページの件数) */
export type TablePage = { id: string; first: number; rows: number };

const CDATA = /<!\[CDATA\[([\s\S]*?)\]\]>/g;
const COUNT = /(\d+)(\s*件\s*\(\s*)(\d+)(\s*\/\s*)(\d+)/;

/** 応答の中の、ある id の update の中身。無ければ null */
function updateHtml(xml: string, id: string): string | null {
  for (const m of xml.matchAll(/<update\s+id="([^"]*)"[^>]*>([\s\S]*?)<\/update>/g)) if (m[1] === id) return (m[2] ?? "").replace(CDATA, "$1");
  return null;
}

/**
 * ページ送り(encodeFeature 付き)の応答は、`<update id="表の id">` に新しい行(`<tr data-ri=...>`)だけが入っている(実機で記録)。
 * 元の PrimeFaces は表の本体 `#<id>_data` の中身をその行に替え、ページャーはクライアントで直す。表そのものは差し替えない。
 * 行を入れたら true(その update は applyPartialResponse に渡さない)
 */
export function fillRows(doc: Document, id: string, xml: string): boolean {
  const html = updateHtml(xml, id);
  const body = doc.getElementById(`${id}_data`);
  if (html === null || !body) return false;
  const rows = new DOMParser().parseFromString(`<table><tbody>${html}</tbody></table>`, "text/html").querySelectorAll("tbody > tr");
  body.replaceChildren(...[...rows].map((tr) => doc.importNode(tr, true)));
  return true;
}

function report(template: string, v: { page: number; count: number; total: number; first: number; rows: number }): string {
  return template
    .replace("{currentPage}", String(v.page + 1))
    .replace("{totalPages}", String(v.count))
    .replace("{totalRecords}", String(v.total))
    .replace("{startRecord}", String(v.total ? v.first + 1 : 0))
    .replace("{endRecord}", String(Math.min(v.first + v.rows, v.total)))
    .replace("{rows}", String(v.rows));
}

/** 見えるページ番号の範囲(PrimeFaces と同じ: 今のページを中ほどに、端では詰める) */
function pageWindow(page: number, count: number, links: number): [number, number] {
  let start = Math.max(0, Math.ceil(page - links / 2));
  const end = Math.min(count - 1, start + links - 1);
  start = Math.max(0, start - (links - (end - start + 1)));
  return [start, end];
}

/**
 * ページ送り・件数変更のあと、文書のページャー(上下)を新しいページに合わせる。PrimeFaces がクライアントでする更新と同じ:
 * 今のページの印、ページ番号の窓、「N件 (p / q)」の文字、先頭・前・次・最後の無効、1 ページの件数の選択。
 * 部品の表(cw の paginator 設定)の page / rows も新しい値にする
 */
export function updatePaginator(doc: Document, t: TablePage): void {
  const table = doc.getElementById(t.id);
  if (!table) return;
  const pg = (scanWidgets(doc).get(t.id)?.cfg.paginator ?? {}) as Record<string, unknown>;
  const page = Math.floor(t.first / t.rows);
  for (const bar of table.querySelectorAll(".ui-paginator")) {
    const current = bar.querySelector(".ui-paginator-current");
    const old = COUNT.exec(current?.textContent ?? "");
    const total = Number(pg.rowCount) || Number(old?.[1]) || 0;
    const count = Math.max(1, Math.ceil(total / t.rows));
    const template = [pg.currentPageTemplate, pg.currentPageReportTemplate].find((x): x is string => typeof x === "string");
    if (current) {
      if (template) current.textContent = report(template, { page, count, total, first: t.first, rows: t.rows });
      else if (old) current.textContent = (current.textContent ?? "").replace(COUNT, `$1$2${page + 1}$4${count}`);
    }
    for (const [k, off] of [["first", page <= 0], ["prev", page <= 0], ["next", page >= count - 1], ["last", page >= count - 1]] as const)
      bar.querySelector(`.ui-paginator-${k}`)?.classList.toggle("ui-state-disabled", off);
    const holder = bar.querySelector(".ui-paginator-pages");
    const first = holder?.querySelector(".ui-paginator-page");
    if (holder) {
      const [start, end] = pageWindow(page, count, Number(pg.pageLinks) || holder.querySelectorAll(".ui-paginator-page").length || 10);
      const links: Element[] = [];
      for (let i = start; i <= end; i++) {
        const a = first ? (first.cloneNode(false) as Element) : doc.createElement("a");
        a.removeAttribute("data-mu-ref"); // 読み取りのたびに付け直す
        a.classList.toggle("ui-state-active", i === page);
        a.textContent = String(i + 1);
        links.push(a);
      }
      holder.replaceChildren(...links);
    }
    const rpp = bar.querySelector<HTMLSelectElement>(".ui-paginator-rpp-options");
    if (rpp) {
      rpp.value = String(t.rows);
      for (const o of rpp.options) (o.value === String(t.rows) ? o.setAttribute("selected", "") : o.removeAttribute("selected"));
    }
  }
  pg.page = page;
  pg.rows = t.rows;
}
