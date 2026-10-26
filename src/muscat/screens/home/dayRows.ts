import type { HomeDayItem } from "@/muscat/api/types";

/** 時限の開始と終了(元の時間割の注記どおり) */
export const PERIODS = [
  { start: "8:50", end: "10:30" },
  { start: "10:40", end: "12:20" },
  { start: "13:10", end: "14:50" },
  { start: "15:00", end: "16:40" },
  { start: "16:50", end: "18:30" },
  { start: "18:40", end: "20:20" },
  { start: "20:20", end: "22:00" },
];

const hhmm = (t: string) => t.replace(/^0/, "");

/** 開始時刻から時限(1〜7)を決める。一致しなければ null */
export function periodOf(start: string): number | null {
  const i = PERIODS.findIndex((p) => p.start === hhmm(start));
  return i < 0 ? null : i + 1;
}

/** 時限の行。item が null なら空き。periods は続けてまとめた分 */
export type DayRow = { periods: number[]; start: string; end: string; item: HomeDayItem | null };

/**
 * 1〜7 限の行にする。同じ授業(同じ title)の続く時限は 1 行にまとめるが、2 限と 3 限(昼休み)はまとめない。
 * 授業ではない予定と、時限に当てはまらない予定は extras(時刻のまま出す)
 */
export function dayRows(items: HomeDayItem[]): { rows: DayRow[]; extras: HomeDayItem[] } {
  const byPeriod = new Map<number, HomeDayItem>();
  const extras: HomeDayItem[] = [];
  for (const it of items) {
    const p = it.plain ? null : periodOf(it.start);
    if (p === null || byPeriod.has(p)) extras.push(it);
    else byPeriod.set(p, it);
  }
  const rows: DayRow[] = [];
  for (let p = 1; p <= PERIODS.length; p++) {
    const it = byPeriod.get(p) ?? null;
    const last = rows[rows.length - 1];
    if (it && last?.item?.title === it.title && last.periods[last.periods.length - 1] === p - 1 && p !== 3) {
      last.periods.push(p);
      last.end = PERIODS[p - 1]!.end;
    } else {
      rows.push({ periods: [p], start: PERIODS[p - 1]!.start, end: PERIODS[p - 1]!.end, item: it });
    }
  }
  return { rows, extras };
}

const DATE = /(\d{4})\/(\d{1,2})\/(\d{1,2})(\(.\))?/;

/** "2026/10/27(火)" → "10月27日(火)"。読めなければそのまま */
export const dateTitle = (date: string) => {
  const m = DATE.exec(date);
  return m ? `${Number(m[2])}月${Number(m[3])}日${m[4] ?? ""}` : date;
};

/** 画面の日付が now と同じ日か */
export const isSameDay = (date: string, now: Date) => {
  const m = DATE.exec(date);
  return !!m && Number(m[1]) === now.getFullYear() && Number(m[2]) === now.getMonth() + 1 && Number(m[3]) === now.getDate();
};

/** "10:40" → 分 */
export const minutes = (t: string) => {
  const [h, m] = t.split(":");
  return Number(h) * 60 + Number(m);
};
