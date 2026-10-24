import { useState } from "react";
import type { Day, TimetableEntry, TimetableIrregular } from "@/muscat/api/types";
import type { CourseKey } from "../course/useCourse";
import { toBlocks, type Block } from "./blocks";
import { DAYS, END, PERIODS, START } from "./period";

// 1 行目は曜日の見出し。昼休みは 2 限(行 3)と 3 限(行 5)の間の行 4
const rowOf = (p: number) => (p <= 2 ? p + 1 : p + 2);

type Props = {
  entries: TimetableEntry[];
  irregular: TimetableIrregular[];
  /** 今日の曜日と今の時限。表示中の学期が今の学期でないとき(や日曜・授業時間外)は null */
  today: Day | null;
  period: number | null;
  onOpen: (key: CourseKey) => void;
};

const isNow = (b: Block, today: Day | null, period: number | null) =>
  b.day === today && period !== null && b.start <= period && period <= b.end;

function IrregularList({ irregular, onOpen }: Pick<Props, "irregular" | "onOpen">) {
  return (
    <div className="flex flex-col gap-2 px-4 py-3">
      <div className="text-[12.5px] font-bold">曜日・時限が決まっていない授業</div>
      <div className="flex flex-wrap gap-x-5 gap-y-2">
        {irregular.map((r) => (
          <div key={r.code} className="flex flex-wrap items-baseline gap-x-2">
            <button
              type="button"
              onClick={() => onOpen({ title: r.subject, code: r.code })}
              className="cursor-pointer border-0 bg-transparent p-0 text-left text-sm underline"
            >
              {r.subject}
            </button>
            <span className="text-xs text-muted-foreground">{`${r.campus}、${r.credits.toFixed(1)} 単位`}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Table({ entries, irregular, today, period, onOpen }: Props) {
  return (
    <div className="overflow-hidden rounded-[4px] border border-border bg-card max-[767px]:hidden">
      <div className="overflow-x-auto">
        <div
          className="grid min-w-[840px]"
          // 7 限まで画面の縦に収める(上の帯・操作の段・余白・下の帯の分を引く)。3 行が読める高さより小さくはしない
          style={{
            gridTemplateColumns: "64px repeat(6, minmax(128px, 1fr))",
            gridTemplateRows: "36px repeat(2, minmax(64px, 1fr)) 14px repeat(5, minmax(64px, 1fr))",
            height: `calc(100dvh - ${irregular.length ? 200 : 130}px)`,
          }}
        >
          <div className="bg-muted" style={{ gridRow: 1, gridColumn: 1 }} />
          {DAYS.map((d, i) => (
            <div
              key={d}
              className={`flex items-center justify-center text-[12.5px] font-bold ${d === today ? "bg-primary text-primary-foreground" : "bg-muted"}`}
              style={{ gridRow: 1, gridColumn: i + 2 }}
            >
              {d === today ? `${d}(今日)` : d}
            </div>
          ))}
          {PERIODS.map((p) => (
            <div
              key={p}
              className={`flex flex-col items-center justify-center border-b border-border/60 ${p === period ? "text-primary shadow-[inset_3px_0_0_var(--primary)]" : ""}`}
              style={{ gridRow: rowOf(p), gridColumn: 1 }}
            >
              <span className="text-[13px] font-bold">{`${p}限`}</span>
              <span className="text-[10.5px] text-muted-foreground">{START[p - 1]}</span>
            </div>
          ))}
          {PERIODS.flatMap((p) =>
            DAYS.map((d, i) => (
              <div
                key={`${p}${d}`}
                className={`border-b border-l border-border/60 ${d === today ? "bg-accent/40" : ""}`}
                style={{ gridRow: rowOf(p), gridColumn: i + 2 }}
              />
            )),
          )}
          <div className="bg-muted" style={{ gridRow: 4, gridColumn: "1 / -1" }} />
          {toBlocks(entries).map((b) => (
            <button
              type="button"
              key={`${b.day}${b.start}${b.entry.code}`}
              onClick={() => onOpen({ title: b.entry.subject, code: b.entry.code })}
              className={`m-1 flex cursor-pointer flex-col items-start gap-0.5 overflow-hidden rounded-[4px] px-2.5 py-2 text-left text-foreground ${
                isNow(b, today, period) ? "border-2 border-primary bg-accent" : "border border-input bg-card"
              }`}
              style={{ gridRow: `${rowOf(b.start)} / ${rowOf(b.end) + 1}`, gridColumn: DAYS.indexOf(b.day) + 2 }}
            >
              <span className="text-sm font-bold">{b.entry.room}</span>
              <span className="text-[13px] font-semibold">{b.entry.subject}</span>
              <span className="text-[11.5px] text-muted-foreground">{b.entry.teacher}</span>
            </button>
          ))}
        </div>
      </div>
      {irregular.length > 0 && (
        <div className="border-t border-border">
          <IrregularList irregular={irregular} onOpen={onOpen} />
        </div>
      )}
    </div>
  );
}

function DayList({ entries, irregular, today, period, onOpen }: Props) {
  // 自分で選ぶまでは今日の曜日に付いていく(開いたまま日付が変わっても)
  const [picked, setDay] = useState<Day | null>(null);
  const day = picked ?? today ?? "月";
  const blocks = toBlocks(entries.filter((e) => e.day === day));
  const rows: { p: number; b?: Block }[] = [];
  for (let p = 1; p <= PERIODS.length; ) {
    const b = blocks.find((x) => x.start === p);
    rows.push({ p, b });
    p = b ? b.end + 1 : p + 1;
  }
  return (
    <div className="flex flex-col gap-3 min-[768px]:hidden">
      <div role="tablist" className="grid grid-cols-6 border-b border-border bg-card">
        {DAYS.map((d) => (
          <button
            key={d}
            type="button"
            role="tab"
            aria-selected={d === day}
            onClick={() => setDay(d)}
            className={`h-11 cursor-pointer border-0 bg-transparent text-sm ${
              d === day ? "font-bold text-primary shadow-[inset_0_-3px_0_var(--primary)]" : "text-foreground"
            }`}
          >
            {d === today ? `${d} 今日` : d}
          </button>
        ))}
      </div>
      <div className="flex flex-col gap-2">
        {rows.map(({ p, b }) => (
          <div key={p} className="flex gap-2">
            <div className={`flex w-14 shrink-0 flex-col whitespace-nowrap pt-1 ${b ? "text-primary" : "text-muted-foreground"}`}>
              <span className="text-[13px] font-bold">{b && b.end > b.start ? `${b.start}・${b.end}限` : `${p}限`}</span>
              <span className="text-[10.5px] text-muted-foreground">{START[p - 1]}</span>
            </div>
            {b ? (
              <button
                type="button"
                onClick={() => onOpen({ title: b.entry.subject, code: b.entry.code })}
                className={`flex min-w-0 flex-1 cursor-pointer flex-col items-start gap-0.5 rounded-[4px] p-3 text-left text-foreground ${
                  isNow(b, today, period) ? "border-2 border-primary bg-accent" : "border border-input bg-card"
                }`}
              >
                <span className="text-base font-bold">{b.entry.room}</span>
                <span className="font-semibold">{b.entry.subject}</span>
                <span className="text-xs text-muted-foreground">{`${b.entry.teacher}、${START[b.start - 1]}〜${END[b.end - 1]}`}</span>
              </button>
            ) : (
              <div className="h-9 flex-1 rounded-[4px] border border-dashed border-input" />
            )}
          </div>
        ))}
      </div>
      {irregular.length > 0 && (
        <div className="rounded-[4px] border border-border bg-card">
          <IrregularList irregular={irregular} onOpen={onOpen} />
        </div>
      )}
    </div>
  );
}

export function TimetableGrid(props: Props) {
  return (
    <>
      <Table {...props} />
      <DayList {...props} />
    </>
  );
}
