import { IconX } from "@tabler/icons-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { MuscatClient } from "@/muscat/api/client";
import type { TeacherEvent, TeacherSchedulePage } from "@/muscat/api/types";
import { BusyOverlay } from "@/ui/BusyOverlay";
import { Button } from "@/ui/Button";
import { ErrorNotice } from "@/ui/ErrorNotice";
import { errorToast } from "@/ui/Toast";
import { eventColor, eventLabel, groupEvents, gridRange, monthGrid, type DayEvent } from "./monthGrid";

const WEEK = ["日", "月", "火", "水", "木", "金", "土"];
// 1 日に 30 件近い日もあり、全部出すと月の表として読めない(実機で確認)。多い日は「ほか N 件」で開く
const MAX = 3;

/** その日の予定の一覧。マスの中に出すと後ろのマスが上に重なって読めず、✕も押せなかった(実機で確認)ので、画面の真ん中に出す */
function DayEvents({ date, events, onClose }: { date: string; events: DayEvent[]; onClose: () => void }) {
  useEffect(() => {
    const key = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", key);
    return () => document.removeEventListener("keydown", key);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-[rgb(31_26_36/.32)] p-4 max-[767px]:place-items-end max-[767px]:p-0" onClick={(e) => e.target === e.currentTarget && onClose()}>
      {/* 狭い画面は画面下からのシート */}
      <div role="dialog" aria-label={`${date} の予定`} className="flex max-h-[70vh] w-full max-w-sm flex-col rounded-[4px] border border-border bg-card shadow-md max-[767px]:max-w-none max-[767px]:rounded-b-none max-[767px]:border-x-0 max-[767px]:border-b-0">
        <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
          <b className="text-sm">{`${date.replaceAll("-", "/")} の予定 ${events.length} 件`}</b>
          <button type="button" aria-label="閉じる" onClick={onClose} className="grid size-8 cursor-pointer place-items-center rounded-[4px] border-0 bg-transparent hover:bg-muted max-[767px]:size-9"><IconX size={20} /></button>
        </div>
        <ul className="m-0 flex list-none flex-col gap-1 overflow-y-auto p-3">
          {events.map((e, j) => (
            <li key={j} className={`rounded-[2px] px-2 py-1 text-[13px] ${eventColor(e.kind)}`}>{eventLabel(e)}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}

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
  const [month, setMonth] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [events, setEvents] = useState<TeacherEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const loadedOnce = useRef(false);
  const [tries, setTries] = useState(0); // 再読み込みのたびに増やして effect をやり直す
  const [shown, setShown] = useState<string | null>(null);
  const hasSchedule = !!page.scheduleId;
  useEffect(() => {
    if (!hasSchedule) return;
    let live = true;
    setLoading(true);
    setError(null);
    const [from, to] = gridRange(month);
    client
      .teacherEvents(from, to)
      .then((e) => live && (setEvents(e), (loadedOnce.current = true)))
      .catch((e: unknown) => {
        if (!live) return;
        setEvents([]); // 前の月の予定を残さない
        const message = e instanceof Error ? e.message : String(e);
        // 一度でも読めていれば月を移った失敗なのでトースト。まだ何も読めていなければ画面にエラーを出す
        if (loadedOnce.current) errorToast("予定を読み込めませんでした", message);
        else setError(message);
      })
      .finally(() => live && setLoading(false));
    return () => {
      live = false;
    };
  }, [client, hasSchedule, month, tries]);
  const grid = useMemo(() => monthGrid(month, today), [month, today]);
  const byDate = useMemo(() => groupEvents(events), [events]);
  if (!hasSchedule) return null;
  const move = (n: number) => setMonth(new Date(month.getFullYear(), month.getMonth() + n, 1));
  const isThisMonth = month.getFullYear() === today.getFullYear() && month.getMonth() === today.getMonth();
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
      {error && <ErrorNotice title="予定を読み込めませんでした" message={error} onRetry={() => setTries((n) => n + 1)} />}
      <section className="overflow-hidden rounded-[4px] border border-border bg-card">
        <div className="flex flex-wrap items-center gap-2 border-b border-border px-3.5 py-2.5">
          <Button variant="secondary" label="前の月" disabled={loading} onClick={() => move(-1)}>‹</Button>
          <b className="min-w-28 text-center text-base">{`${month.getFullYear()}年${month.getMonth() + 1}月`}</b>
          <Button variant="secondary" label="次の月" disabled={loading} onClick={() => move(1)}>›</Button>
          <Button variant="secondary" label="今月" disabled={loading || isThisMonth} onClick={() => setMonth(new Date(today.getFullYear(), today.getMonth(), 1))}>今月</Button>
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
      {shown && <DayEvents date={shown} events={byDate.get(shown) ?? []} onClose={() => setShown(null)} />}
    </>
  );
}
