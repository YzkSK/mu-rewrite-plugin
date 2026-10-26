import type { CourseListItem } from "../types";
import { squash } from "./genericControls";

const DATE = /\d{4}\/\d{2}\/\d{2}/;

function parseCourse(li: Element): CourseListItem {
  const input = li.querySelector<HTMLInputElement>("input.ui-inputtext");
  // 保存ボタンは、シラバス照会(lessonBtnArea)ではない方のボタン
  const save = [...li.querySelectorAll("button")].filter((b) => !b.closest(".lessonBtnArea")).pop();
  return {
    title: squash(li.querySelector("p.lessonTitle")?.textContent),
    // 全角数字の時限もある
    slots: [...li.querySelectorAll(".lessonHead span")].flatMap((s) => {
      const m = /([月火水木金土日])\s*(\d+)/.exec(squash(s.textContent).normalize("NFKC"));
      return m ? [{ weekday: m[1]!, period: Number(m[2]) }] : [];
    }),
    teachers: [...li.querySelectorAll(".lessonDetail a.ui-commandlink")].map((a) => squash(a.textContent)).filter(Boolean),
    room: squash(li.querySelector(".lessonDetail > div")?.textContent),
    notices: [...li.querySelectorAll(".lessonKeijiArea .ui-panel-content > p")].flatMap((p) => {
      const text = squash(p.textContent);
      if (!text) return [];
      const title = squash(p.querySelector("a")?.textContent) || squash(text.replace(DATE, ""));
      return [{ date: DATE.exec(text)?.[0] ?? "", title }];
    }),
    memo: input ? { value: input.value, inputName: input.name, saveId: save?.id ?? "" } : null,
    syllabusId: li.querySelector(".lessonBtnArea button")?.id ?? "",
  };
}

/** ホームの履修授業タブ(選ばれていなくても DOM にある)。無ければ空 */
export function parseCourseList(root: Document): CourseListItem[] {
  return [...root.querySelectorAll("#portalLessonList li.ui-dataview-row")].map(parseCourse);
}
