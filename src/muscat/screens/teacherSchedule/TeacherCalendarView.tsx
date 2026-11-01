import { useMemo, useState } from "react";
import type { MuscatClient } from "@/muscat/api/client";
import type { TeacherSchedulePage } from "@/muscat/api/types";
import { BusyOverlay } from "@/ui/BusyOverlay";
import { Button } from "@/ui/Button";
import { ErrorNotice } from "@/ui/ErrorNotice";
import { DayEventsDialog } from "./DayEventsDialog";
import { eventColor, eventLabel, groupEvents, monthGrid } from "./monthGrid";
import { useMonthEvents } from "./useMonthEvents";

const WEEK = ["日", "月", "火", "水", "木", "金", "土"];
// 1 日に 30 件近い日もあり、全部出すと月の表として読めない(実機で確認)。多い日は「ほか N 件」で開く
const MAX = 3;
const read = (c: MuscatClient, from: Date, to: Date) => c.teacherEvents(from, to);

const Legend = ({ color, text }: { color: string; text: string }) => (
  <span className="flex items-center gap-1 text-xs text-muted-foreground">
    <span className={`size-2.5 rounded-[2px] ${color}`} />
    {text}
  </span>
);

type Props = { page: TeacherSchedulePage; client: MuscatClient; busy: boolean; onBack: (ref: string) => void };

/** 選んだ教員の月カレンダー(閲覧のみ)。予定は通信で直接取り、月の表はここで組み立てる。日曜は赤、月の外のマスは薄い地 */
export function TeacherCalendarView({ page, client, busy, onBack }: Props) {
  const [today] = useState(() => new Date());
  const hasSchedule = !!page.scheduleId;
  const { month, events, loading, error, retry, move, goThisMonth, isThisMonth } = useMonthEvents(client, read, today, hasSchedule);
  const [shown, setShown] = useState<string | null>(null);
  const grid = useMemo(() => monthGrid(month, today), [month, today]);
  const byDate = useMemo(() => groupEvents(events), [events]);
  if (!hasSchedule) return null;
  return (
    <>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        {page.backRef && (
          <button type="button" disabled={busy || loading} onClick={() => onBack(page.backRef)} className="cursor-pointer border-0 bg-transparent p-0 text-[12.5px] text-primary hover:underline disabled:cursor-default disabled:opacity-60 max-[767px]:h-11">
            ‹ 検索に戻る
          </button>
        )}
        <h2 className="m-0 text-[18px] font-bold">{`${page.teacher} の予定`}</h2>
        <span className="text-[12.5px] text-muted-foreground">見るだけ。変更はできません</span>
      </div>
      {error && <ErrorNotice title="予定を読み込めませんでした" message={error} onRetry={retry} />}
      <section className="overflow-hidden rounded-[4px] border border-border bg-card">
        <div className="flex flex-wrap items-center gap-2 border-b border-border px-3.5 py-2.5">
          <Button variant="secondary" label="前の月" disabled={loading} onClick={() => move(-1)}>‹</Button>
          <b className="min-w-28 text-center text-base">{`${month.getFullYear()}年${month.getMonth() + 1}月`}</b>
          <Button variant="secondary" label="次の月" disabled={loading} onClick={() => move(1)}>›</Button>
          <Button variant="secondary" label="今月" disabled={loading || isThisMonth} onClick={goThisMonth}>今月</Button>
          <span className="flex-1" />
          <Legend color="bg-accent" text="授業" />
          <Legend color="bg-muted" text="そのほかの予定" />
        </div>
        <BusyOverlay busy={loading}>
          <div className="grid grid-cols-7">
            {WEEK.map((d, i) => (
              <div key={d} className={`border-b border-border bg-muted p-1.5 text-center text-xs font-semibold ${i === 0 ? "text-error" : "text-muted-foreground"}`}>{d}</div>
            ))}
            {grid.map((d, i) => {
              const list = d.other ? [] : (byDate.get(d.date) ?? []);
              return (
                <div
                  key={d.date}
                  style={{ "--i": Math.floor(i / 7) + (i % 7) } as React.CSSProperties}
                  className={`mu-cell relative grid min-h-[86px] min-w-0 content-start gap-0.5 border-b border-border/60 p-1 max-[767px]:min-h-14 ${i % 7 !== 6 ? "border-r" : ""} ${d.other ? "bg-muted/50" : ""}`}
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
                  {list.slice(0, MAX).map((e, j) => (
                    <span key={j} title={eventLabel(e)} className={`truncate rounded-[2px] px-1 text-[11px] max-[767px]:hidden ${eventColor(e.kind)}`}>{eventLabel(e)}</span>
                  ))}
                  {list.length > MAX && (
                    <button type="button" onClick={() => setShown(d.date)} className="cursor-pointer border-0 bg-transparent p-0 text-left text-[11px] text-primary hover:underline max-[767px]:hidden">
                      {`ほか ${list.length - MAX} 件`}
                    </button>
                  )}
                  {/* 狭い画面は予定の文字を出さないので、印を出し、マス全体を押してその日の一覧を開く */}
                  {list.length > 0 && (
                    <>
                      <span className="size-1.5 rounded-full bg-primary min-[768px]:hidden" />
                      <button type="button" aria-label={`${d.day}日 予定 ${list.length} 件`} onClick={() => setShown(d.date)} className="absolute inset-0 cursor-pointer border-0 bg-transparent p-0 min-[768px]:hidden" />
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </BusyOverlay>
      </section>
      {shown && <DayEventsDialog date={shown} events={byDate.get(shown) ?? []} rowClass={(e) => eventColor(e.kind)} rowText={eventLabel} onClose={() => setShown(null)} />}
    </>
  );
}
