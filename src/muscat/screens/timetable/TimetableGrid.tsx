import { Chip } from "@/ui/Chip";
import type { Day, TimetableEntry } from "@/muscat/api/types";
import { toBlocks } from "./blocks";

const DAYS: Day[] = ["月", "火", "水", "木", "金", "土"];
const PERIODS = [1, 2, 3, 4, 5, 6];
// 1 行目は曜日の見出し。昼休みは 2 限(行 3)と 3 限(行 5)の間の行 4
const rowOf = (p: number) => (p <= 2 ? p + 1 : p + 2);

export function TimetableGrid({ entries }: { entries: TimetableEntry[] }) {
  const cell = "border border-border bg-card";
  return (
    <div
      className="grid min-w-[44rem] gap-px text-sm"
      style={{ gridTemplateColumns: "3rem repeat(6, minmax(0, 1fr))", gridTemplateRows: "auto repeat(2, 5.5rem) 2rem repeat(4, 5.5rem)" }}
    >
      {DAYS.map((d, i) => (
        <div key={d} className="py-1 text-center font-bold text-primary" style={{ gridRow: 1, gridColumn: i + 2 }}>
          {d}
        </div>
      ))}
      {PERIODS.map((p) => (
        <div key={p} className="flex items-center justify-center text-muted-foreground" style={{ gridRow: rowOf(p), gridColumn: 1 }}>
          {`${p}限`}
        </div>
      ))}
      {PERIODS.flatMap((p) =>
        DAYS.map((d, i) => <div key={`${p}${d}`} className={cell} style={{ gridRow: rowOf(p), gridColumn: i + 2 }} />),
      )}
      <div className="flex items-center justify-center bg-muted text-muted-foreground" style={{ gridRow: 4, gridColumn: "1 / -1" }}>
        昼休み
      </div>
      {toBlocks(entries).map((b) => (
        <div
          key={`${b.day}${b.start}${b.entry.code}`}
          className="m-0.5 flex flex-col gap-0.5 overflow-hidden rounded-md bg-secondary p-1.5 text-secondary-foreground"
          style={{ gridRow: `${rowOf(b.start)} / ${rowOf(b.end) + 1}`, gridColumn: DAYS.indexOf(b.day) + 2 }}
        >
          <span className="font-bold leading-tight">{b.entry.subject}</span>
          <span className="text-xs">{b.entry.room}</span>
          {b.entry.campus ? <Chip>{b.entry.campus}</Chip> : null}
        </div>
      ))}
    </div>
  );
}
