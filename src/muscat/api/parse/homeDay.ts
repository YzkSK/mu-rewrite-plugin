import { assignRef } from "../driver/locator";
import type { HomeDay, HomeDayItem } from "../types";
import { squash } from "./genericControls";

const TIME = /\d{1,2}:\d{2}/;
const NAV = { prevWeek: "前週", prevDay: "前日", today: "今日", nextDay: "翌日", nextWeek: "翌週" } as const;

function parseItem(li: Element): HomeDayItem {
  const times = [...li.querySelectorAll(".lessonHead span.period")].map((s) => squash(s.textContent)).filter((t) => TIME.test(t));
  const main = li.querySelector(".lessonMain");
  const titleEl = li.querySelector("p.lessonTitle");
  const input = li.querySelector<HTMLInputElement>("input.ui-inputtext");
  // 保存ボタンは、シラバス照会(lessonBtnArea)ではない方のボタン
  const save = [...li.querySelectorAll("button")].filter((b) => !b.closest(".lessonBtnArea")).pop();
  const syllabus = li.querySelector(".lessonBtnArea button");
  let title = squash(titleEl?.textContent);
  if (!titleEl) {
    const c = li.cloneNode(true) as Element;
    c.querySelector(".lessonHead")?.remove();
    title = squash(c.textContent);
  }
  return {
    start: times[0] ?? "",
    end: times[1] ?? "",
    title,
    teachers: [...li.querySelectorAll(".lessonDetail a.ui-commandlink")].map((a) => squash(a.textContent)).filter(Boolean),
    room: squash(li.querySelector(".lessonDetail > div")?.textContent),
    keijiCount: main?.querySelectorAll(":scope > .ui-panel > .ui-panel-content > *").length ?? 0,
    syllabusRef: syllabus ? assignRef(syllabus) : "",
    memo: input ? { value: input.value, inputRef: assignRef(input), saveRef: save ? assignRef(save) : "" } : null,
    plain: !titleEl,
  };
}

/**
 * ホームの日表示。選ばれていないタブのパネルにも DOM はあるので常に読める。無ければ null。
 * 「時間別」の h3 より後ろの最初の dataview を読む(同じパネルの近くにリンクの dataview があるため)
 */
export function parseHomeDay(root: Document): HomeDay | null {
  const panel = root.querySelector("p.dateBtnArea")?.closest(".ui-tabs-panel");
  if (!panel) return null;
  const buttons = [...panel.querySelectorAll("p.dateBtnArea button")];
  const ref = (label: string) => {
    const b = buttons.find((x) => squash(x.textContent) === label);
    return b ? assignRef(b) : "";
  };
  const h3 = [...panel.querySelectorAll("h3")].find((h) => squash(h.textContent) === "時間別");
  const list = h3 && [...panel.querySelectorAll(".ui-dataview")].find((d) => h3.compareDocumentPosition(d) & Node.DOCUMENT_POSITION_FOLLOWING);
  // 構造が変わって読めないのに「授業なし」と出さないよう、読めないとして扱う(画面は「予定を読み込めませんでした」)
  if (!list) return null;
  return {
    date: squash(panel.querySelector("span.dateDisp")?.textContent),
    nav: {
      prevWeek: ref(NAV.prevWeek),
      prevDay: ref(NAV.prevDay),
      today: ref(NAV.today),
      nextDay: ref(NAV.nextDay),
      nextWeek: ref(NAV.nextWeek),
    },
    allDay: [...panel.querySelectorAll(".ourscheduleArea a.ui-commandlink")].map((a) => ({ title: squash(a.textContent), ref: assignRef(a) })),
    items: list ? [...list.querySelectorAll("li.ui-dataview-row")].map(parseItem) : [],
  };
}
