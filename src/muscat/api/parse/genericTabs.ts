import { assignRef } from "../driver/locator";
import type { GBlock } from "../types";
import { squash } from "./genericControls";

const SELECTED = ".ui-tabs-selected, .ui-state-active, .ui-tabs-active";
const tabItems = (nav: Element) => [...nav.querySelectorAll("li")].filter((li) => li.querySelector("a"));

/** .ui-tabs-nav → tabs。a を持つ li だけ */
export function tabsBlock(nav: Element): GBlock | null {
  const tabs = tabItems(nav).map((li) => {
    const a = li.querySelector("a")!;
    return { label: squash(a.textContent), ref: assignRef(a), selected: li.matches(SELECTED) };
  });
  return tabs.length > 0 ? { kind: "tabs", tabs } : null;
}

/** パネルが、選択中のタブのものか(選択中が分からなければ最初)。タブが見つからなければ読む */
export function isSelectedPanel(panel: Element): boolean {
  const box = panel.closest(".ui-tabs");
  const nav = box && [...box.querySelectorAll(".ui-tabs-nav")].find((n) => n.closest(".ui-tabs") === box);
  if (!nav) return true;
  const panels = [...panel.parentElement!.children].filter((c) => c.matches(".ui-tabs-panel"));
  const selected = tabItems(nav).findIndex((li) => li.matches(SELECTED));
  return panels.indexOf(panel) === Math.max(selected, 0);
}
