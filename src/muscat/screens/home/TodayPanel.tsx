import type { HomeDay } from "@/muscat/api/types";
import { Button } from "@/ui/Button";
import { EmptyState } from "@/ui/EmptyState";
import { Panel } from "@/ui/Panel";
import { dateTitle, dayRows, isSameDay, minutes, type DayRow } from "./dayRows";

type Props = { day: HomeDay | null; timetableRef: string; busy: boolean; now: Date; onClick: (ref: string) => void; onOpenCourse: (title: string) => void };

const label = (ps: number[]) => (ps.length === 1 ? `${ps[0]}限` : `${ps.join("・")}限`);

function Row({ row, state, onOpen }: { row: DayRow; state: "now" | "past" | "later"; onOpen: (title: string) => void }) {
  const it = row.item;
  return (
    <li className={`grid grid-cols-[3.5rem_1fr] items-start gap-3 ${state === "past" ? "opacity-45" : ""}`}>
      <div className="flex flex-col text-sm font-semibold">
        {label(row.periods)}
        <small className="font-normal text-muted-foreground">{row.start}</small>
      </div>
      {it ? (
        <button
          type="button"
          onClick={() => onOpen(it.title)}
          className={`flex min-w-0 cursor-pointer flex-col items-start gap-0.5 rounded-[4px] border px-3 py-2 text-left ${state === "now" ? "border-primary bg-primary/10" : "border-border bg-transparent"}`}
        >
          {it.room && <span className="text-base font-semibold">{it.room}</span>}
          <b className="text-sm">{it.title}</b>
          <span className="text-xs text-muted-foreground">
            {[`〜${row.end}`, it.teachers.join("、")].filter(Boolean).join("、")}
            {it.keijiCount > 0 && <span className="ml-2 font-semibold text-primary">{`掲示 ${it.keijiCount}`}</span>}
          </span>
        </button>
      ) : (
        <span className="py-1 text-xs text-muted-foreground">空き</span>
      )}
    </li>
  );
}

/** 今日(または選んだ日)の 1〜7 限。「今」と終わった時限の見分けは、画面の日付が now と同じ日のときだけ */
export function TodayPanel({ day, timetableRef, busy, now, onClick, onOpenCourse }: Props) {
  const nav = day?.nav;
  const nav3 = (name: string, ref: string | undefined) => (
    <Button variant="ghost" disabled={busy || !ref} onClick={() => onClick(ref!)}>{name}</Button>
  );
  const actions = (
    <div className="flex gap-1">
      {nav3("前の日", nav?.prevDay)}
      {nav3("次の日", nav?.nextDay)}
      {nav3("今日", nav?.today)}
    </div>
  );
  const { rows, extras } = dayRows(day?.items ?? []);
  const today = !!day && isSameDay(day.date, now);
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const stateOf = (r: DayRow) => (!today ? "later" : nowMin >= minutes(r.end) ? "past" : nowMin >= minutes(r.start) ? "now" : "later");
  return (
    <Panel title={day ? dateTitle(day.date) : "今日"} titleClassName="text-[20px] font-bold" actions={actions}>
      <div className="flex flex-col gap-3">
        <button
          type="button"
          disabled={busy || !timetableRef}
          onClick={() => onClick(timetableRef)}
          className="cursor-pointer rounded-[4px] border border-border bg-muted px-3 py-2 text-left text-sm disabled:cursor-default disabled:opacity-60"
        >
          時間割変更を見る
        </button>
        {day && day.allDay.length > 0 && (
          <ul className="flex flex-col gap-1">
            {day.allDay.map((a, i) => (
              <li key={`${a.ref}-${i}`}>
                <button type="button" disabled={busy} onClick={() => onClick(a.ref)} className="cursor-pointer text-left text-xs underline-offset-2 hover:underline">
                  {a.title}
                </button>
              </li>
            ))}
          </ul>
        )}
        {!day || !rows.some((r) => r.item) ? (
          <EmptyState title={day ? "この日は授業がありません" : "予定を読み込めませんでした"} />
        ) : (
          <ul className="flex flex-col gap-2">
            {rows.map((r) => (
              <Row key={r.periods[0]} row={r} state={stateOf(r)} onOpen={onOpenCourse} />
            ))}
          </ul>
        )}
        {extras.length > 0 && (
          <div className="flex flex-col gap-1 border-t border-border pt-3">
            <h3 className="m-0 text-xs font-semibold text-muted-foreground">自分の予定</h3>
            <ul className="flex flex-col gap-1 text-sm">
              {extras.map((e, i) => (
                <li key={i} className="flex gap-3">
                  <span className="w-24 shrink-0 text-xs leading-5 text-muted-foreground">{e.end ? `${e.start}〜${e.end}` : e.start}</span>
                  <span className="min-w-0">{e.title}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </Panel>
  );
}
