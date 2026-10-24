import type { CalendarDay, TeacherCalendar } from "../types";
import { squash } from "./genericControls";
import { refOf } from "./liveFields";

const pad = (n: string) => n.padStart(2, "0");

function parseDay(td: Element): CalendarDay {
  const num = td.querySelector(".fc-daygrid-day-number");
  const m = /(\d+)年(\d+)月(\d+)日/.exec(num?.getAttribute("aria-label") ?? "");
  return {
    day: Number.parseInt(squash(num?.textContent), 10) || 0,
    date: m ? `${m[1]}-${pad(m[2]!)}-${pad(m[3]!)}` : "",
    other: td.classList.contains("fc-day-other"),
    today: td.classList.contains("fc-day-today"),
    events: [...td.querySelectorAll(".fc-event")].map((e) => ({
      time: squash(e.querySelector(".fc-event-time")?.textContent),
      title: squash(e.querySelector(".fc-event-title")?.textContent),
    })),
  };
}

/** FullCalendar の月表示(.fc)。ボタンの ref を付ける */
export function parseCalendar(fc: Element): TeacherCalendar {
  return {
    title: squash(fc.querySelector(".fc-toolbar-title")?.textContent),
    prevRef: refOf(fc.querySelector(".fc-prev-button")),
    nextRef: refOf(fc.querySelector(".fc-next-button")),
    todayRef: refOf(fc.querySelector(".fc-today-button:not([disabled])")),
    days: [...fc.querySelectorAll("td.fc-daygrid-day")].map(parseDay),
  };
}
