import { useEffect, useMemo, useState } from "react";
import type { MuscatClient } from "@/muscat/api/client";
import type { HomeEvent } from "@/muscat/api/types";
import { BusyOverlay } from "@/ui/BusyOverlay";
import { Button } from "@/ui/Button";
import { ErrorNotice } from "@/ui/ErrorNotice";
import { eventLabel, groupEvents, gridRange, monthGrid, type DayEvent } from "../teacherSchedule/monthGrid";

type Kind = HomeEvent["kind"];
const WEEK = ["日", "月", "火", "水", "木", "金", "土"];
// 授業の多い日もあるので、マスには 3 件まで。残りは「ほか N 件」で開く
const MAX = 3;

/** 予定の色。行事は紫の地、掲示は紫の枠、授業・予定は薄い地、祝日は赤い文字だけ */
const STYLE: Record<Kind, string> = {
  holiday: "px-0 text-error",
  event: "bg-primary text-primary-foreground",
  notice: "border border-[#C9B6DC] text-primary",
  class: "bg-muted text-foreground",
  other: "bg-muted text-foreground",
};
const label = (e: DayEvent<Kind>) => (e.kind === "notice" ? `掲示 ${eventLabel(e)}` : eventLabel(e));

function DayEvents({ date, events, onClose }: { date: string; events: DayEvent<Kind>[]; onClose: () => void }) {
  useEffect(() => {
    const key = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", key);
    return () => document.removeEventListener("keydown", key);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-[rgb(31_26_36/.32)] p-4" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-label={`${date} の予定`} className="flex max-h-[70vh] w-full max-w-sm flex-col rounded-[4px] border border-border bg-card shadow-md">
        <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
          <b className="text-sm">{`${date.replaceAll("-", "/")} の予定 ${events.length} 件`}</b>
          <button type="button" aria-label="閉じる" onClick={onClose} className="size-8 cursor-pointer rounded-[4px] border-0 bg-transparent hover:bg-muted">✕</button>
        </div>
        <ul className="m-0 flex list-none flex-col gap-1 overflow-y-auto p-3">
          {events.map((e, j) => (
            <li key={j} className={`rounded-[2px] px-2 py-1 text-[13px] ${STYLE[e.kind]}`}>{label(e)}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}

const Legend = ({ swatch, text }: { swatch: string; text: string }) => (
  <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
    <span className={`size-2.5 rounded-[2px] ${swatch}`} />
    {text}
  </span>
);

/** ホームの月表示。予定は元のページの Schedule と同じ通信で取る。日曜と祝日は赤、今日は紫の四角 */
export function HomeCalendar({ client, onBack, today: given }: { client: MuscatClient; onBack: () => void; today?: Date }) {
  const [today] = useState(() => given ?? new Date()); // 描くたびに作り直すと、月の表も毎回作り直しになる
  const [month, setMonth] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [events, setEvents] = useState<HomeEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shown, setShown] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    setLoading(true);
    setError(null);
    const [from, to] = gridRange(month);
    client
      .homeEvents(from, to)
      .then((e) => live && setEvents(e))
      .catch((e: unknown) => {
        if (!live) return;
        setEvents([]); // 前の月の予定を残さない
        setError(e instanceof Error ? e.message : String(e));
      })
      .finally(() => live && setLoading(false));
    return () => {
      live = false;
    };
  }, [client, month]);
  const grid = useMemo(() => monthGrid(month, today), [month, today]);
  const byDate = useMemo(() => groupEvents(events), [events]);
  const move = (n: number) => setMonth(new Date(month.getFullYear(), month.getMonth() + n, 1));
  const isThisMonth = month.getFullYear() === today.getFullYear() && month.getMonth() === today.getMonth();
  return (
    <section className="rounded-[4px] border border-border bg-card">
      <div className="flex items-center gap-3 border-b border-border px-4 py-2.5">
        {/* 押す前の通信(予定の読み込み)と重ならないよう、読み込み中は戻れない */}
        <button type="button" disabled={loading} onClick={onBack} className="cursor-pointer border-0 bg-transparent p-0 text-[12.5px] text-primary hover:underline disabled:cursor-default disabled:opacity-60">
          ‹ ホームに戻る
        </button>
        <h2 className="m-0 text-[15px] font-bold">カレンダー</h2>
      </div>
      <div className="flex flex-wrap items-center gap-2.5 px-4 py-3">
        <Button variant="secondary" label="前の月" disabled={loading} onClick={() => move(-1)}>‹</Button>
        <b className="min-w-28 text-center text-lg">{`${month.getFullYear()}年${month.getMonth() + 1}月`}</b>
        <Button variant="secondary" label="次の月" disabled={loading} onClick={() => move(1)}>›</Button>
        <Button variant="secondary" disabled={loading || isThisMonth} onClick={() => setMonth(new Date(today.getFullYear(), today.getMonth(), 1))}>今月</Button>
        <span className="flex-1" />
        <span className="flex flex-wrap gap-3">
          <Legend swatch="bg-primary" text="大学の行事" />
          <Legend swatch="border border-[#C9B6DC]" text="掲示" />
          <Legend swatch="bg-muted" text="授業・予定" />
        </span>
      </div>
      {error && <div className="px-4 pb-3"><ErrorNotice title="予定を読み込めませんでした" message={error} /></div>}
      <BusyOverlay busy={loading}>
        <div className="grid grid-cols-7 border-t border-border">
          {WEEK.map((d, i) => (
            <div key={d} className={`border-b border-border bg-muted p-1.5 text-center text-xs font-semibold ${i === 0 ? "text-error" : "text-muted-foreground"}`}>{d}</div>
          ))}
          {grid.map((d, i) => {
            const list = d.other ? [] : (byDate.get(d.date) ?? []);
            const red = !d.other && (i % 7 === 0 || list.some((e) => e.kind === "holiday"));
            return (
              <div key={d.date} className={`flex min-h-[92px] min-w-0 flex-col gap-0.5 border-b border-[#ECE9EF] px-1.5 py-1 max-sm:min-h-14 ${i % 7 !== 6 ? "border-r" : ""} ${d.other ? "bg-[#FAF9FB]" : ""}`}>
                <span
                  className={`self-start text-xs tabular-nums ${
                    d.today ? "rounded-[3px] bg-primary px-1.5 font-semibold text-primary-foreground" : d.other ? "text-[#B8B2BF]" : red ? "font-semibold text-error" : "text-muted-foreground"
                  }`}
                >
                  {d.day}
                </span>
                {list.slice(0, MAX).map((e, j) => (
                  <span key={j} title={label(e)} className={`truncate rounded-[2px] px-1 text-[11px] leading-[1.5] max-sm:hidden ${STYLE[e.kind]}`}>{label(e)}</span>
                ))}
                {list.length > MAX && (
                  <button type="button" onClick={() => setShown(d.date)} className="cursor-pointer border-0 bg-transparent p-0 text-left text-[11px] text-primary hover:underline max-sm:hidden">
                    {`ほか ${list.length - MAX} 件`}
                  </button>
                )}
                {/* 狭い画面は予定の文字を出さないので、印を押してその日の一覧を開く */}
                {list.length > 0 && (
                  <button type="button" aria-label={`予定 ${list.length} 件`} onClick={() => setShown(d.date)} className="grid size-6 cursor-pointer place-items-center border-0 bg-transparent p-0 sm:hidden">
                    <span className="size-1.5 rounded-full bg-primary" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </BusyOverlay>
      {shown && <DayEvents date={shown} events={byDate.get(shown) ?? []} onClose={() => setShown(null)} />}
    </section>
  );
}
