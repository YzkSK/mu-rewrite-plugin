import { assignRef } from "../driver/locator";
import type { NewsItem } from "../types";
import { squash } from "./genericControls";

const META = /^\s*\[(.*?)\]\s*(\d{4}\/\d{2}\/\d{2})/;

/** アイコンは全行にあり、表示されているかどうかで重要・新着を決める */
export function visible(el: Element | null): boolean {
  if (!el) return false;
  const s = getComputedStyle(el);
  return s.display !== "none" && s.visibility !== "hidden";
}

/** 掲示 1 件の行(直下に dl.textOf を持つ div.alignRight)だけ。「すべて既読にする」などの操作の行は除く */
export function newsRowsIn(root: ParentNode): Element[] {
  return [...root.querySelectorAll("div.alignRight")].filter((d) => [...d.children].some((c) => c.matches("dl.textOf")));
}

/** 文字がちょうど text の button。スクロール枠の中(行のボタン)は除く */
export function buttonByText(scope: ParentNode | null, text: string): HTMLElement | null {
  return [...(scope?.querySelectorAll<HTMLElement>("button") ?? [])].find((b) => squash(b.textContent) === text && !b.closest(".ui-scrollpanel")) ?? null;
}

/** ボタンの文言: フラグは「フラグをつける」以外ならフラグ付き、既読は「既読にする」ならいま未読 */
export function parseNewsRow(row: Element): NewsItem {
  const dl = [...row.children].find((c) => c.matches("dl.textOf"))!;
  const link = dl.querySelector<HTMLElement>("a.ui-commandlink");
  const buttons = [...row.querySelectorAll("span.inlineBlock > div.ui-selectbooleanbutton")].filter((b) => b.parentElement?.parentElement === row);
  const [flag, read] = buttons;
  // 「更新」は同じグループの中、グループでなければ同じタブパネルの中
  const update = buttonByText(row.closest(".ui-accordion-content") ?? row.closest(".ui-tabs-panel"), "更新");
  let meta: RegExpExecArray | null = null;
  for (const n of [...dl.childNodes].reverse()) {
    if (n.nodeType === 3 && (meta = META.exec(n.textContent ?? ""))) break;
  }
  return {
    title: squash(link?.textContent),
    category: squash(dl.querySelector("span.keijiCategory")?.textContent),
    // 旧版が先に整形していると、文字は span.mu-from / span.mu-date(MM/DD)に作り替えられている
    source: meta?.[1] ?? squash(dl.querySelector("span.mu-from")?.textContent),
    date: meta?.[2] ?? squash(dl.querySelector("span.mu-date")?.textContent),
    important: visible(dl.querySelector("i.fa-exclamation-circle")),
    isNew: visible(dl.querySelector("i.fa-lightbulb-o")),
    unread: !!read && squash(read.textContent).includes("既読にする"),
    flagged: !!flag && !squash(flag.textContent).includes("フラグをつける"),
    openRef: link ? assignRef(link) : "",
    flagRef: flag ? assignRef(flag) : "",
    readRef: read ? assignRef(read) : "",
    updateRef: update ? assignRef(update) : "",
  };
}
