import { useEffect, useState } from "react";
import type { CalendarDay, TeacherSchedulePage } from "@/muscat/api/types";
import { Button } from "@/ui/Button";

const WEEK = ["日", "月", "火", "水", "木", "金", "土"];
// 1 日に 30 件近い日もあり、全部出すと月の表として読めない(実機で確認)。多い日は「ほか N 件」で開く
const MAX = 3;
const label = (e: CalendarDay["events"][number]) => `${e.time} ${e.title}`.trim();

/** その日の予定の一覧。マスの中に出すと後ろのマスが上に重なって読めず、✕も押せなかった(実機で確認)ので、画面の真ん中に出す */
function DayEvents({ day, onClose }: { day: CalendarDay; onClose: () => void }) {
  useEffect(() => {
    const key = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", key);
    return () => document.removeEventListener("keydown", key);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-[rgb(31_26_36/.32)] p-4" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-label={`${day.date} の予定`} className="flex max-h-[70vh] w-full max-w-sm flex-col rounded-[4px] border border-border bg-card shadow-md">
        <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
          <b className="text-sm">{`${day.date.replaceAll("-", "/")} の予定 ${day.events.length} 件`}</b>
          <button type="button" aria-label="閉じる" onClick={onClose} className="size-8 cursor-pointer rounded-[4px] border-0 bg-transparent hover:bg-muted">✕</button>
        </div>
        <ul className="m-0 flex list-none flex-col gap-1 overflow-y-auto p-3">
          {day.events.map((e, j) => (
            <li key={j} className="rounded-[2px] bg-accent px-2 py-1 text-[13px] text-accent-foreground">{label(e)}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}

type Props = { page: TeacherSchedulePage; busy: boolean; act: string | null; onClick: (ref: string) => void };

/** 選んだ教員の月カレンダー(閲覧のみ)。月の移動は元の画面のボタンを押す。日曜は赤、月の外のマスは薄い地 */
export function TeacherCalendarView({ page, busy, act, onClick }: Props) {
  const [shown, setShown] = useState<CalendarDay | null>(null);
  const cal = page.calendar;
  if (!cal) return null;
  const nav = (label: string, ref: string, text: string) => (
    <Button key={label} variant="secondary" label={label} disabled={busy || !ref} loading={!!ref && act === ref} onClick={() => onClick(ref)}>{text}</Button>
  );
  return (
    <>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        {page.backRef && (
          <button type="button" disabled={busy} onClick={() => onClick(page.backRef)} className="cursor-pointer border-0 bg-transparent p-0 text-[12.5px] text-primary hover:underline disabled:cursor-default disabled:opacity-60">
            ‹ 検索に戻る
          </button>
        )}
        <h2 className="m-0 text-[18px] font-bold">{`${page.teacher} の予定`}</h2>
        <span className="text-[12.5px] text-muted-foreground">見るだけ。変更はできません</span>
      </div>
      <section className="overflow-hidden rounded-[4px] border border-border bg-card">
        <div className="flex flex-wrap items-center gap-2 border-b border-border px-3.5 py-2.5">
          {nav("前の月", cal.prevRef, "‹")}
          <b className="min-w-28 text-center text-base">{cal.title}</b>
          {nav("次の月", cal.nextRef, "›")}
          {nav("今月", cal.todayRef, "今月")}
        </div>
        <div className="grid grid-cols-7">
          {WEEK.map((d, i) => (
            <div key={d} className={`border-b border-border bg-muted p-1.5 text-center text-xs font-semibold ${i === 0 ? "text-error" : "text-muted-foreground"}`}>{d}</div>
          ))}
          {cal.days.map((d, i) => (
            <div
              key={`${cal.title}:${i}`}
              style={{ "--i": Math.floor(i / 7) + (i % 7) } as React.CSSProperties}
              className={`mu-cell grid min-h-[86px] min-w-0 content-start gap-0.5 border-b border-border/60 p-1 max-sm:min-h-14 ${i % 7 !== 6 ? "border-r" : ""} ${d.other ? "bg-muted/50" : ""}`}
            >
              <span
                className={`text-xs tabular-nums ${
                  d.today
                    ? "grid size-[22px] place-items-center rounded-full bg-primary font-bold text-primary-foreground"
                    : d.other
                      ? "text-muted-foreground/50"
                      : i % 7 === 0
                        ? "font-semibold text-error"
                        : "text-muted-foreground"
                }`}
              >
                {d.day}
              </span>
              {!d.other && d.events.slice(0, MAX).map((e, j) => (
                <span key={j} title={label(e)} className="truncate rounded-[2px] bg-accent px-1 text-[11px] text-accent-foreground max-sm:hidden">{label(e)}</span>
              ))}
              {!d.other && d.events.length > MAX && (
                <button type="button" onClick={() => setShown(d)} className="cursor-pointer border-0 bg-transparent p-0 text-left text-[11px] text-primary hover:underline max-sm:hidden">
                  {`ほか ${d.events.length - MAX} 件`}
                </button>
              )}
              {!d.other && d.events.length > 0 && <span aria-label={`予定 ${d.events.length} 件`} className="size-1.5 rounded-full bg-primary sm:hidden" />}
            </div>
          ))}
        </div>
      </section>
      {shown && <DayEvents day={shown} onClose={() => setShown(null)} />}
    </>
  );
}
