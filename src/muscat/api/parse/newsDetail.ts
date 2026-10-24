import { assignRef } from "../driver/locator";
import type { NewsDetail } from "../types";
import { squash } from "./genericControls";

const ref = (el: Element | null) => (el ? assignRef(el) : "");

/**
 * 詳細ダイアログ。開いている(aria-hidden="false")ときだけ。項目名と値のペアは全部拾う。
 * 見た目の display では判断しない(拡張が元の画面を CSS で隠すので、開いていても none になる。実機で確認)
 */
export function parseNewsDetail(doc: Document): NewsDetail | null {
  const dialog = doc.getElementById("bsd00702:dialog");
  if (!dialog || dialog.getAttribute("aria-hidden") !== "false") return null;
  const fields: NewsDetail["fields"] = [];
  // 実ページの項目名のセルは .ui-widget-header(実機で確認)
  for (const head of dialog.querySelectorAll("table.ui-panelgrid.singleTable td.ui-panelgrid-cell.ui-widget-header")) {
    const cell = head.nextElementSibling;
    if (!cell) continue;
    const body = cell.querySelector("div.fr-view") ?? cell;
    fields.push({ label: squash(head.querySelector("label.ui-outputlabel")?.textContent ?? head.textContent), text: squash(body.textContent), html: body.innerHTML });
  }
  // ✕ で閉じると中身は消えるが、aria-hidden は false のまま残る(拡張が元の画面を隠すため閉じる動きが終わらない。実機で確認)
  if (fields.length === 0) return null;
  const flag = dialog.querySelector("div.ui-selectbooleanbutton");
  return {
    title: fields.find((f) => f.label === "件名")?.text ?? "",
    fields,
    flagged: !!flag && !squash(flag.textContent).includes("フラグをつける"),
    flagRef: ref(flag),
    prevRef: ref(dialog.querySelector('button[title^="前の掲示情報"]')),
    nextRef: ref(dialog.querySelector('button[title^="次の掲示情報"]')),
    closeRef: ref(dialog.querySelector(".ui-dialog-titlebar-close")),
  };
}
