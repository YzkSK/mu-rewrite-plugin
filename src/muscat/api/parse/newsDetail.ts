import { assignRef } from "../driver/locator";
import type { NewsDetail } from "../types";
import { squash } from "./genericControls";
import { visible } from "./newsRows";

const ref = (el: Element | null) => (el ? assignRef(el) : "");

/** 詳細ダイアログ。開いている(display が none でない)ときだけ。項目名と値のペアは全部拾う */
export function parseNewsDetail(doc: Document): NewsDetail | null {
  const dialog = doc.getElementById("bsd00702:dialog");
  if (!dialog || !visible(dialog)) return null;
  const fields: NewsDetail["fields"] = [];
  for (const head of dialog.querySelectorAll("table.ui-panelgrid.singleTable td.ui-panelgrid-cell.-header")) {
    const cell = head.nextElementSibling;
    if (!cell) continue;
    const body = cell.querySelector("div.fr-view") ?? cell;
    fields.push({ label: squash(head.querySelector("label.ui-outputlabel")?.textContent ?? head.textContent), text: squash(body.textContent), html: body.innerHTML });
  }
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
