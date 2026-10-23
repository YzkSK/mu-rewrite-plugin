import { assignRef } from "../driver/locator";
import type { HomeNotice, HomeNoticeTab } from "../types";
import { squash } from "./genericControls";

const DATE = /\d{4}\/\d{2}\/\d{2}/;
const LINK = "a.ui-commandlink";

/** 件名のリンクから、そのリンク 1 つだけを含む最も外側の要素(= 1 行)まで上る。行の構造が未確認なので、構造に依らない */
function rowOf(link: Element, list: Element): Element {
  let row = link;
  while (row.parentElement && row.parentElement !== list && row.parentElement.querySelectorAll(LINK).length === 1) row = row.parentElement;
  return row;
}

function parseNotice(link: Element, list: Element): HomeNotice {
  const title = squash(link.textContent);
  const text = squash(rowOf(link, list).textContent);
  const rest = text.slice(text.indexOf(title) + title.length);
  return { date: DATE.exec(text)?.[0] ?? "", title, source: /\[(.*)\]/.exec(rest)?.[1]?.trim() ?? "", openRef: assignRef(link) };
}

/** お知らせ(#portalSupport)。パネルは全部 DOM にあるので、タブごとに全部読む */
export function parseHomeNotices(root: Document): HomeNoticeTab[] {
  const tabs = root.querySelector("#portalSupport .ui-tabs");
  if (!tabs) return [];
  const panels = [...tabs.querySelectorAll(":scope > .ui-tabs-panels > .ui-tabs-panel")];
  return [...tabs.querySelectorAll(":scope > .ui-tabs-nav > li")].map((li, i) => {
    const a = li.querySelector("a");
    const panel = panels[i];
    const list = panel?.querySelector("div.ui-dataview-list") ?? null;
    const items = list ? [...list.querySelectorAll(LINK)].map((l) => parseNotice(l, list)) : [];
    return {
      name: squash(a?.textContent ?? li.textContent),
      ref: a ? assignRef(a) : "",
      selected: li.classList.contains("ui-tabs-selected"),
      items,
      empty: items.length === 0 && /情報はありません/.test(panel?.textContent ?? ""),
    };
  });
}
