import { assignRef } from "../driver/locator";
import { ParseError } from "../errors";
import type { NewsGroup, NewsItem, NewsPage, NewsTab } from "../types";
import { squash } from "./genericControls";
import { parseNewsDetail } from "./newsDetail";
import { newsRowsIn, parseNewsRow } from "./newsRows";

const input = (doc: Document, name: string) => doc.querySelector<HTMLInputElement>(`input[name="${name}"]`);
const ref = (el: Element | null) => (el ? assignRef(el) : "");

function parseTabs(content: Element): NewsTab[] {
  return [...content.querySelectorAll('div.ui-tabs[id$="tabArea"] > ul.ui-tabs-nav li')].flatMap((li) => {
    const a = li.querySelector("a");
    return a ? [{ name: squash(a.textContent), ref: assignRef(a), selected: li.classList.contains("ui-tabs-selected") }] : [];
  });
}

/** グループのパネル: アコーディオンの見出しごとに、直後の兄弟の中の行 */
function parseGroups(panel: Element): NewsGroup[] {
  return [...panel.querySelectorAll(".ui-accordion-header")].map((h) => ({
    title: squash(h.textContent),
    items: h.nextElementSibling ? newsRowsIn(h.nextElementSibling).map(parseNewsRow) : [],
  }));
}

/**
 * 掲示板(#funcContent)を、選択中のタブのパネルだけ読む。
 * 副作用: 操作する要素(タブ・件名・フラグ・既読・検索欄・ダイアログのボタン)に data-mu-ref を付ける
 */
export function parseNews(root: Document): NewsPage {
  const content = root.getElementById("funcContent");
  if (!content) throw new ParseError("funcContent がありません");
  const tabs = parseTabs(content);
  const panels = [...content.querySelectorAll(".ui-tabs-panels > .ui-tabs-panel")];
  const panel = panels[Math.max(0, tabs.findIndex((t) => t.selected))];
  let groups: NewsGroup[] | null = null;
  let items: NewsItem[] = [];
  if (panel?.querySelector(".ui-accordion")) {
    groups = parseGroups(panel);
    items = groups.flatMap((g) => g.items);
  } else if (panel) items = newsRowsIn(panel).map(parseNewsRow);
  const keyword = input(root, "funcForm:keyword");
  const course = input(root, "funcForm:jugyoKamoku");
  return {
    tabs,
    keyword: keyword?.value ?? "",
    course: course?.value ?? "",
    keywordRef: ref(keyword),
    courseRef: ref(course),
    searchRef: ref(root.getElementById("funcForm:search")),
    groups,
    items,
    empty: items.length === 0 && /データが存在しません/.test(panel?.textContent ?? ""),
    detail: parseNewsDetail(root),
  };
}
