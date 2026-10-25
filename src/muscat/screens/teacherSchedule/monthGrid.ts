import type { TeacherEvent } from "@/muscat/api/types";

export type GridDay = { date: string; day: number; other: boolean; today: boolean };
/** kind は予定の種類(教員の予定なら授業かそれ以外、ホームなら祝日・行事・掲示・授業) */
export type DayEvent<K extends string = TeacherEvent["kind"]> = { time: string; title: string; kind: K };

const pad = (n: number) => String(n).padStart(2, "0");
/** ローカル時刻の日付 "2026-10-02" */
export const dateKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/** month を含む月の 6 週(その月の 1 日を含む週の日曜から 42 日)。月の外のマスは other */
export function monthGrid(month: Date, today: Date): GridDay[] {
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(first.getFullYear(), first.getMonth(), 1 - first.getDay() + i);
    return { date: dateKey(d), day: d.getDate(), other: d.getMonth() !== first.getMonth(), today: dateKey(d) === dateKey(today) };
  });
}

/** 取る範囲: 表の最初の日の 0 時から、最後の日の翌日の 0 時まで */
export function gridRange(month: Date): [Date, Date] {
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const from = new Date(first.getFullYear(), first.getMonth(), 1 - first.getDay());
  return [from, new Date(from.getFullYear(), from.getMonth(), from.getDate() + 42)];
}

/** 予定を日付(ローカル時刻)ごとにまとめ、時刻順に並べる。終日は時刻なしで先頭。何日にもまたがる予定は終わりの日まで毎日に出す(時刻は始まりの日だけ) */
export function groupEvents<K extends string>(events: { start: string; end: string; allDay: boolean; title: string; kind: K }[]): Map<string, DayEvent<K>[]> {
  const sorted = events
    .map((e) => ({ e, at: new Date(e.start), until: new Date(e.end) }))
    .filter((x) => !Number.isNaN(x.at.getTime()))
    .sort((a, b) => Number(a.e.allDay ? 0 : 1) - Number(b.e.allDay ? 0 : 1) || a.at.getTime() - b.at.getTime());
  const map = new Map<string, DayEvent<K>[]>();
  for (const { e, at, until } of sorted) {
    // end はその時刻を含まない(終日なら次の日の 0 時)。読めなければ始まりの日だけ
    const last = Number.isNaN(until.getTime()) ? at : new Date(until.getTime() - 1);
    const day = new Date(at.getFullYear(), at.getMonth(), at.getDate());
    for (let n = 0; n < 62 && (n === 0 || day <= last); n++, day.setDate(day.getDate() + 1)) {
      const key = dateKey(day);
      const list = map.get(key) ?? [];
      list.push({ time: e.allDay || n > 0 ? "" : `${pad(at.getHours())}:${pad(at.getMinutes())}`, title: e.title, kind: e.kind });
      map.set(key, list);
    }
  }
  return map;
}

export const eventLabel = (e: DayEvent<string>) => `${e.time} ${e.title}`.trim();
export const eventColor = (kind: DayEvent["kind"]) => (kind === "class" ? "bg-accent text-accent-foreground" : "bg-muted text-foreground");
