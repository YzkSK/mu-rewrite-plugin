import { courseName, dueName } from "@/portal/lib/lms";
import { ajax, LoginRequiredError, shortName } from "./api";

export type Due = { name: string; course: string; due: number; overdue: boolean; canSubmit: boolean; url: string; kind: string };
export type News = { subject: string; author: string; at: number | null; url: string };
export type Recent = { id: number; name: string; url: string };
/** 欄ごとに null = 読めなかった */
export type HomeData = { due: Due[] | null; news: News[] | null; recent: Recent[] | null };

const DAY = 86400;

type RawEvent = { name: string; timesort: number; overdue: boolean; url: string; course?: { fullname?: string }; modulename?: string; action?: { actionable?: boolean } };

export const toDue = (e: RawEvent): Due => ({
  name: dueName(e.name),
  course: courseName(e.course?.fullname ?? ""),
  due: e.timesort,
  overdue: !!e.overdue,
  canSubmit: !!e.action?.actionable,
  url: e.url,
  kind: e.modulename ?? "",
});

/** 期限切れ(新しい順)・今から 7 日以内(近い順)・それより先(近い順)。now は秒 */
export function groupDue(list: Due[], now: number): { overdue: Due[]; week: Due[]; later: Due[] } {
  const asc = [...list].sort((a, b) => a.due - b.due);
  const overdue = asc.filter((d) => d.overdue).reverse();
  const rest = asc.filter((d) => !d.overdue);
  return { overdue, week: rest.filter((d) => d.due - now <= 7 * DAY), later: rest.filter((d) => d.due - now > 7 * DAY) };
}

/** 未来なら「あと N 日 N 時間」(1 日未満は「あと N 時間 N 分」)。過去は空 */
export function remain(due: number, now: number): string {
  const s = due - now;
  if (s <= 0) return "";
  if (s >= DAY) return `あと ${Math.floor(s / DAY)} 日 ${Math.floor((s % DAY) / 3600)} 時間`;
  return `あと ${Math.floor(s / 3600)} 時間 ${Math.floor((s % 3600) / 60)} 分`;
}

type RawFeed = { title: string; subTitle: string; actionUrl: string; description?: string };

export function toNews(f: RawFeed): News {
  // description は HTML。innerHTML には入れず、DOMParser で time だけ読む
  const t = new DOMParser().parseFromString(f.description ?? "", "text/html").querySelector("time")?.getAttribute("datetime");
  const at = t ? Date.parse(t) : NaN;
  return { subject: f.subTitle, author: shortName(f.title), at: Number.isNaN(at) ? null : at, url: f.actionUrl };
}

export const toRecent = (c: { id: number; fullname: string; viewurl: string }): Recent => ({ id: c.id, name: courseName(c.fullname), url: c.viewurl });

/** 3 つを別々に取る。1 つ失敗しても他は出す。セッション切れなら読み直す(未ログイン判定でログインへ行く) */
export async function loadHome(userId: number, now: number): Promise<HomeData> {
  // shortcut: 60 日で固定、学期の始めは MUSCAT 連携(後の PR)で取れたら替える
  // 60 日前から取る(2 週間前からだと古い期限切れ(10/4・10/11)が抜けた。実機で確認)
  // 過去と未来を分けて取る(まとめると古い期限切れで件数の上限を使い切り、これからの期限がこぼれる)
  const events = (from: number, to?: number) =>
    ajax<{ events: RawEvent[] }>("core_calendar_get_action_events_by_timesort", { timesortfrom: from, ...(to ? { timesortto: to } : {}), limitnum: 50, limittononsuspendedevents: true });
  const [due, news, recent] = await Promise.allSettled([
    Promise.all([events(now - 60 * DAY, now - 1), events(now)]).then(([a, b]) => ({ events: [...a.events, ...b.events] })),
    ajax<RawFeed[]>("theme_snap_feed", { feedid: "forumposts", page: 0, pagesize: 5, maxid: -1 }),
    ajax<{ id: number; fullname: string; viewurl: string }[]>("core_course_get_recent_courses", { userid: userId, limit: 5 }),
  ]);
  if ([due, news, recent].some((r) => r.status === "rejected" && r.reason instanceof LoginRequiredError)) location.reload();
  return {
    due: due.status === "fulfilled" ? due.value.events.map(toDue) : null,
    news: news.status === "fulfilled" ? news.value.map(toNews) : null,
    recent: recent.status === "fulfilled" ? recent.value.map(toRecent) : null,
  };
}
