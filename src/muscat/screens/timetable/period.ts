import type { Day } from "@/muscat/api/types";

export const DAYS: Day[] = ["月", "火", "水", "木", "金", "土"];
export const PERIODS = [1, 2, 3, 4, 5, 6, 7];
export const START = ["8:50", "10:40", "13:10", "15:00", "16:50", "18:40", "20:20"];
export const END = ["10:30", "12:20", "14:50", "16:40", "18:30", "20:20", "22:00"];

const toMin = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  return h! * 60 + m!;
};

/** 年度は 4 月始まり(1〜3 月は前年)。学期は月で決める */
export function currentYearTerm(now: Date): { year: number; term: 1 | 2 | 3 | 4 } {
  const m = now.getMonth() + 1;
  const year = m >= 4 ? now.getFullYear() : now.getFullYear() - 1;
  // shortcut: 学期の境目は月で近似。正確な日付が要るなら学年暦から取る
  const term = m <= 3 ? 4 : m <= 5 ? 1 : m <= 8 ? 2 : m <= 11 ? 3 : 4; // 旧版(extension/muscat.js)と同じ区切り
  return { year, term };
}

/** 日曜は null */
export const todayOf = (now: Date): Day | null => DAYS[now.getDay() - 1] ?? null;

/** 授業時間の外(休み時間・夜遅く)は null */
export function periodOf(now: Date): number | null {
  const min = now.getHours() * 60 + now.getMinutes();
  const i = PERIODS.findIndex((_, k) => min >= toMin(START[k]!) && min < toMin(END[k]!));
  return i < 0 ? null : i + 1;
}
