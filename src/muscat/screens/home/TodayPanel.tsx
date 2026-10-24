import type { HomeDay } from "@/muscat/api/types";
import { Button } from "@/ui/Button";
import { EmptyState } from "@/ui/EmptyState";
import { dateTitle, dayRows, isSameDay, minutes, type DayRow } from "./dayRows";

type Props = { day: HomeDay | null; timetableRef: string; busy: boolean; now: Date; onClick: (ref: string) => void; onOpenCourse: (title: string) => void };
type State = "now" | "past" | "later";

const label = (ps: number[]) => `${ps.join("・")}限`;

function Row({ row, state, line, onOpen }: { row: DayRow; state: State; line: boolean; onOpen: (title: string) => void }) {
  const it = row.item;
  const cur = state === "now";
  return (
    <li className={`grid grid-cols-[3.5rem_4px_1fr] items-stretch gap-x-3 py-1.5 ${line ? "-mx-4 mt-1.5 border-t border-dashed border-border px-4 pt-4" : ""}`}>
      <div className={`flex flex-col text-right text-sm font-semibold ${state === "past" ? "text-muted-foreground" : cur ? "text-primary" : ""}`}>
        {label(row.periods)}
        <small className="font-normal text-muted-foreground">{row.start}</small>
      </div>
      <span className={`rounded-full ${cur ? "bg-primary" : "bg-muted"}`} />
      {it ? (
        <button
          type="button"
          onClick={() => onOpen(it.title)}
          className={`flex min-w-0 cursor-pointer flex-col items-start gap-1 rounded-[4px] border px-4 py-3 text-left ${cur ? "border-primary bg-accent" : "border-border bg-card"} ${state === "past" ? "opacity-45" : ""}`}
        >
          <span className="flex flex-wrap items-baseline gap-x-3">
            {it.room && <b className="text-base">{it.room}</b>}
            <b className="text-base">{it.title}</b>
          </span>
          <span className="text-sm text-muted-foreground">
            {[`${row.start}〜${row.end}`, it.teachers.join("、")].filter(Boolean).join("、")}
            {it.keijiCount > 0 && <span className="ml-2 font-semibold text-primary">{`掲示 ${it.keijiCount}`}</span>}
          </span>
        </button>
      ) : (
        <span className="py-1 text-sm text-muted-foreground/60">空き</span>
      )}
    </li>
  );
}

/** 今日(または選んだ日)の 1〜7 限。「今」と終わった時限の見分けは、画面の日付が now と同じ日のときだけ */
export function TodayPanel({ day, timetableRef, busy, now, onClick, onOpenCourse }: Props) {
  const nav = day?.nav;
  const navBtn = (name: string, ref: string | undefined) => (
    <Button variant="ghost"disabled={busy || !ref} onClick={() => onClick(ref!)}>{name}</Button>
  );
  const { rows, extras } = dayRows(day?.items ?? []);
  const today = !!day && isSameDay(day.date, now);
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const stateOf = (r: DayRow): State => (!today ? "later" : nowMin >= minutes(r.end) ? "past" : nowMin >= minutes(r.start) ? "now" : "later");
  const states = rows.map(stateOf);
  // 今の位置の点線:終わった時限と、まだの時限の境目(今日だけ)
  const split = states.findIndex((s) => s !== "past");
  const classes = rows.filter((r) => r.item);
  const summary = classes.length
    ? `${today ? "今日" : "この日"}の授業 ${new Set(classes.map((r) => r.item!.title)).size} 科目(${classes.map((r) => r.periods.join("・")).join("、")}限)`
    : "";
  return (
    <section className="overflow-hidden rounded-[4px] border border-border bg-card text-card-foreground">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 pt-4">
        <h2 className="m-0 text-[20px] font-bold">{day ? dateTitle(day.date) : "今日"}</h2>
        {summary && <span className="text-sm text-muted-foreground">{summary}</span>}
        <div className="ml-auto flex gap-1">
          {navBtn("前の日", nav?.prevDay)}
          {navBtn("次の日", nav?.nextDay)}
          {navBtn("今日", nav?.today)}
        </div>
      </div>
      <div className="flex flex-col gap-3 p-4">
        <button
          type="button"
          disabled={busy || !timetableRef}
          onClick={() => onClick(timetableRef)}
          className="cursor-pointer rounded-[4px] border border-primary/30 bg-accent px-4 py-2.5 text-left text-sm font-semibold text-primary disabled:cursor-default disabled:opacity-60"
        >
          時間割変更を見る
        </button>
        {!day || !classes.length ? (
          <EmptyState title={day ? "この日は授業がありません" : "予定を読み込めませんでした"} />
        ) : (
          <ul className="flex flex-col">
            {rows.map((r, i) => (
              <Row key={r.periods[0]} row={r} state={states[i]!} line={today && i > 0 && i === split} onOpen={onOpenCourse} />
            ))}
          </ul>
        )}
      </div>
      {extras.length > 0 && (
        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 border-t border-border px-4 py-3">
          <h3 className="m-0 text-sm font-normal text-muted-foreground">自分の予定</h3>
          <ul className="flex flex-col gap-1 text-sm">
            {extras.map((e, i) => (
              <li key={i}>{`${e.end ? `${e.start}〜${e.end}` : e.start} ${e.title}`}</li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
