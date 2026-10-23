import type { HomeLesson } from "../types";
import { squash } from "./genericControls";

const PERIOD = /^\s*(\S)\s*(\d+)/;

/** 履修授業(#portalLessonList)。選択中でないタブのパネルにも DOM はあるので、常に読める */
export function parseHomeLessons(root: Document): HomeLesson[] {
  return [...root.querySelectorAll("#portalLessonList li.ui-dataview-row")].map((li) => ({
    slots: [...li.querySelectorAll(".lessonHead span.period")].flatMap((s) => {
      const m = PERIOD.exec((s.textContent ?? "").normalize("NFKC"));
      return m ? [{ weekday: m[1]!, period: Number(m[2]) }] : [];
    }),
    title: squash(li.querySelector("p.lessonTitle")?.textContent),
    teachers: [...li.querySelectorAll(".lessonDetail a.ui-commandlink")].map((a) => squash(a.textContent)).filter(Boolean),
    room: squash(li.querySelector(".lessonDetail > div")?.textContent),
    keijiCount: li.querySelectorAll(".lessonKeijiArea .ui-panel-content > p").length,
  }));
}
