import { courseName, dueName } from "@/portal/lib/lms";
import { pruneEvents } from "../../extension/lmsEvents.js";
import { ajax } from "./api";
import { pageText } from "./home";

export type CalEvent = { id: number; name: string; at: number; url: string; courseId: number | null; course: string; late: boolean; past: boolean };
/** null は月初の前・月末の後の空き */
export type CalDay = { mday: number; today: boolean; events: CalEvent[] } | null;
export type CalMonth = { year: number; month: number; dayNames: string[]; weeks: CalDay[][] };

type RawEvent = { id: number; name: string; timestart: number; url: string; course?: { id?: number; fullname?: string } };
type RawMonth = {
  daynames: { shortname: string }[];
  weeks: { prepadding: number[]; postpadding: number[]; days: { mday: number; istoday: boolean; events: RawEvent[] }[] }[];
};

/** 月のカレンダーを整える。unsubmitted は「未提出の期限切れ」の予定の id(API の overdue は提出済みでも true になるので使わない)。now は秒 */
export function toMonth(year: number, month: number, raw: RawMonth, unsubmitted: Set<number>, now: number): CalMonth {
  const ev = (e: RawEvent): CalEvent => ({
    id: e.id,
    name: dueName(e.name),
    at: e.timestart,
    url: e.url,
    courseId: e.course?.id ?? null,
    course: courseName(e.course?.fullname ?? ""),
    late: e.timestart < now && unsubmitted.has(e.id),
    past: e.timestart < now,
  });
  return {
    year,
    month,
    dayNames: raw.daynames.map((d) => d.shortname),
    weeks: raw.weeks.map((w) => [
      ...w.prepadding.map(() => null),
      ...w.days.map((d) => ({ mday: d.mday, today: d.istoday, events: d.events.map(ev) })),
      ...w.postpadding.map(() => null),
    ]),
  };
}

/** 月は 1-12。未提出の期限切れは、home と同じ action events(過去 60 日、未提出だけが返る)の id */
export async function loadMonth(year: number, month: number, now: number): Promise<CalMonth> {
  const [raw, late] = await Promise.all([
    ajax<RawMonth>("core_calendar_get_calendar_monthly_view", { year, month, courseid: 1, categoryid: 0, includenavigation: false, mini: false, day: 1 }),
    // 未提出の判定が取れなくても月は出す(期限切れは灰になる)
    ajax<{ events: { id: number; url: string; modulename?: string; eventtype?: string }[] }>("core_calendar_get_action_events_by_timesort", { timesortfrom: now - 60 * 86400, timesortto: now - 1, limitnum: 50, limittononsuspendedevents: true })
      .then((r) => pruneEvents(r.events, pageText)) // 回答済みのアンケートは赤くしない
      .catch(() => []),
  ]);
  return toMonth(year, month, raw, new Set(late.map((e) => e.id)), now);
}

/** ?time=<秒> から年月。無い・変なら今の月 */
export function monthOf(search: string, now: Date): { year: number; month: number } {
  const t = Number(new URLSearchParams(search).get("time"));
  const at = t > 0 ? new Date(t * 1000) : null;
  const d = at && !Number.isNaN(at.getTime()) ? at : now; // Infinity や範囲外は Invalid Date になる
  return { year: d.getFullYear(), month: d.getMonth() + 1 };
}
