import { assignRef } from "../driver/locator";
import type { SyllabusDetail, SyllabusDetailRow } from "../types";
import { squash } from "./genericControls";

const ref = (el: Element | null) => (el ? assignRef(el) : "");

/** セルの文字。入れ子の div は 1 行ずつにして、改行(\n)を残す */
function lines(el: Element): string[] {
  const out: string[] = [];
  for (const n of el.childNodes) {
    if (n.nodeType === 3) {
      const t = squash(n.textContent);
      if (t) out.push(t);
    } else if (n instanceof Element) {
      if (n.tagName === "BR") continue;
      out.push(...(n.querySelector("div") ? lines(n) : [squash(n.textContent)].filter(Boolean)));
    }
  }
  return out;
}
const cellText = (el: Element) => lines(el).join("\n");

/**
 * シラバス照会のダイアログ(#pkx02301:dialog)。開いている(aria-hidden="false")ときだけ。
 * 見た目の display では判断しない(拡張が元の画面を隠すので、開いていても none になる。掲示板の詳細と同じ)
 */
export function parseSyllabusDetail(doc: Document): SyllabusDetail | null {
  const dialog = doc.getElementById("pkx02301:dialog");
  if (!dialog || dialog.getAttribute("aria-hidden") !== "false") return null;
  const rows: SyllabusDetailRow[] = [];
  for (const row of dialog.querySelectorAll("div.rowStyle.rowMargin")) {
    if (row.parentElement?.closest(".rowMargin")) continue; // 値の中の行は親の値として読む
    const heads = [...row.children].filter((c) => c.classList.contains("ui-widget-header"));
    const bodies = [...row.children].filter((c) => c.classList.contains("ui-widget-content"));
    // 見出しの無い行は表の中身(成績評価の内訳・教科書の書名・実務経験の本文など。実機で確認)
    if (heads.length === 0) {
      if (bodies.length) rows.push({ kind: "cells", cells: bodies.map(cellText) });
      continue;
    }
    if (bodies.length === 0) {
      rows.push(heads.length === 1 ? { kind: "section", title: cellText(heads[0]!) } : { kind: "head", cells: heads.map(cellText) });
    } else {
      rows.push({ kind: "field", label: cellText(heads[0]!), values: [...bodies, ...heads.slice(1)].map(cellText) });
    }
  }
  // ✕ で閉じても aria-hidden は false のまま中身が残ることがある(掲示板と同じ)。行が無ければ閉じている
  if (rows.length === 0) return null;
  const name = rows.find((r) => r.kind === "field" && r.label === "授業コード・授業科目");
  const full = name?.kind === "field" ? squash(name.values.join(" ")) : ""; // コードと科目名は別のセルに分かれている(実機で確認)
  const m = /^(\d{10})\s*(.*)$/.exec(full);
  const flag = dialog.querySelector("div.ui-selectbooleanbutton");
  return {
    code: m ? m[1]! : "",
    title: (m ? m[2] : full) || squash(dialog.querySelector(".ui-dialog-title")?.textContent),
    rows,
    noteOn: !!flag && !squash(flag.textContent).includes("ふせんを貼る"),
    noteRef: ref(flag),
    printRef: ref(dialog.querySelector("button.btnPrint")),
    closeRef: ref(dialog.querySelector(".ui-dialog-titlebar-close")),
  };
}
