import type { Day, TimetableEntry } from "@/muscat/api/types";

export type Block = { day: Day; start: number; end: number; entry: TimetableEntry };

/** 同じ曜日・同じ code で連続するコマを 1 枚にまとめる。2 限と 3 限の間(昼休み)はまたがない。 */
export function toBlocks(entries: TimetableEntry[]): Block[] {
  const sorted = [...entries].sort(
    (a, b) => a.day.localeCompare(b.day) || a.code.localeCompare(b.code) || a.period - b.period,
  );
  const blocks: Block[] = [];
  for (const entry of sorted) {
    const last = blocks[blocks.length - 1];
    if (last && last.day === entry.day && last.entry.code === entry.code && entry.period === last.end + 1 && last.end !== 2) {
      last.end = entry.period;
    } else {
      blocks.push({ day: entry.day, start: entry.period, end: entry.period, entry });
    }
  }
  return blocks;
}
