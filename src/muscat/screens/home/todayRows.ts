import type { HomeLesson } from "@/muscat/api/types";

/** 時限の開始時刻(7 限だけ 100 分) */
export const START = ["", "9:00", "10:45", "13:00", "14:45", "16:30", "18:15", "20:20"];

export type TodayRow = { periods: number[]; title: string; teachers: string[]; room: string; keijiCount: number };

/** 今日の曜日の授業を、連続する時限ごとに 1 行にして開始順に。3 限の前では必ず区切る(昼休みをまたがせない) */
export function todayRows(lessons: HomeLesson[], weekday: string): TodayRow[] {
  const rows: TodayRow[] = [];
  for (const l of lessons) {
    const ps = [...new Set(l.slots.filter((s) => s.weekday === weekday).map((s) => s.period))].sort((a, b) => a - b);
    let run: number[] = [];
    for (const p of ps) {
      if (run.length && (p !== run[run.length - 1]! + 1 || p === 3)) {
        rows.push({ periods: run, title: l.title, teachers: l.teachers, room: l.room, keijiCount: l.keijiCount });
        run = [];
      }
      run.push(p);
    }
    if (run.length) rows.push({ periods: run, title: l.title, teachers: l.teachers, room: l.room, keijiCount: l.keijiCount });
  }
  return rows.sort((a, b) => a.periods[0]! - b.periods[0]!);
}
