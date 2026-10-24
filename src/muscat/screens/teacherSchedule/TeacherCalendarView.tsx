import type { TeacherSchedulePage } from "@/muscat/api/types";
import { Button } from "@/ui/Button";
import { Card } from "@/ui/Card";

const WEEK = ["日", "月", "火", "水", "木", "金", "土"];

type Props = { page: TeacherSchedulePage; busy: boolean; act: string | null; onClick: (ref: string) => void };

/** 選んだ教員の月カレンダー(閲覧のみ)。月の移動は元の画面のボタンを押す。マスは左上から斜めに出る */
export function TeacherCalendarView({ page, busy, act, onClick }: Props) {
  const cal = page.calendar;
  if (!cal) return null;
  const nav = (label: string, ref: string) => (
    <Button key={label} variant="ghost" disabled={busy || !ref} loading={!!ref && act === ref} onClick={() => onClick(ref)}>{label}</Button>
  );
  return (
    <>
      <div className="flex flex-wrap items-center gap-2.5 rounded-xl bg-secondary px-3.5 py-2.5 text-secondary-foreground">
        <span><b>{page.teacher}</b> さんの予定を見ています(閲覧のみ)</span>
        <span className="flex-1" />
        {page.backRef && <Button variant="ghost" disabled={busy} loading={act === page.backRef} onClick={() => onClick(page.backRef)}>‹ 検索に戻る</Button>}
      </div>
      <Card className="gap-0 overflow-hidden p-0">
        <div className="flex flex-wrap items-center gap-x-3.5 gap-y-2 border-b border-border px-3.5 py-2.5">
          <b className="text-[15px]">{cal.title}</b>
          <span className="flex-1" />
          {nav("‹ 前の月", cal.prevRef)}
          {nav("今月", cal.todayRef)}
          {nav("次の月 ›", cal.nextRef)}
        </div>
        <div className="grid grid-cols-7">
          {WEEK.map((d) => <div key={d} className="border-b border-border bg-sidebar p-1.5 text-center text-xs font-bold text-muted-foreground">{d}</div>)}
          {cal.days.map((d, i) => (
            <div
              key={`${cal.title}:${i}`}
              style={{ "--i": Math.floor(i / 7) + (i % 7) } as React.CSSProperties}
              className={`mu-cell grid min-h-[78px] min-w-0 content-start gap-[3px] border-b border-border p-[5px] max-sm:min-h-14 ${i % 7 !== 6 ? "border-r" : ""}`}
            >
              <span className={`text-xs ${d.today ? "grid size-[22px] place-items-center rounded-full bg-primary font-bold text-primary-foreground" : `text-muted-foreground ${d.other ? "opacity-45" : ""}`}`}>{d.day}</span>
              {!d.other && d.events.map((e, j) => (
                <span key={j} title={`${e.time} ${e.title}`} className="truncate rounded-md bg-secondary px-1.5 py-px text-[11px] text-secondary-foreground max-sm:hidden">{e.time} {e.title}</span>
              ))}
              {!d.other && d.events.length > 0 && <span aria-label={`予定 ${d.events.length} 件`} className="size-1.5 rounded-full bg-primary sm:hidden" />}
            </div>
          ))}
        </div>
      </Card>
    </>
  );
}
