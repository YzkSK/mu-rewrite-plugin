import { IconChevronLeft, IconChevronRight } from "@tabler/icons-react";
import { useMemo, useState } from "react";
import type { MuscatClient } from "@/muscat/api/client";
import type { HomeEvent } from "@/muscat/api/types";
import { BusyOverlay } from "@/ui/BusyOverlay";
import { Button } from "@/ui/Button";
import { ErrorNotice } from "@/ui/ErrorNotice";
import { DayEventsDialog } from "../teacherSchedule/DayEventsDialog";
import { eventLabel, groupEvents, monthGrid, type DayEvent } from "../teacherSchedule/monthGrid";
import { useMonthEvents } from "../teacherSchedule/useMonthEvents";

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
const read = (c: MuscatClient, from: Date, to: Date) => c.homeEvents(from, to);
const label = (e: DayEvent<Kind>) => (e.kind === "notice" ? `掲示 ${eventLabel(e)}` : eventLabel(e));

const Legend = ({ swatch, text }: { swatch: string; text: string }) => (
  <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
    <span className={`size-2.5 rounded-[2px] ${swatch}`} />
    {text}
  </span>
);

/** ホームの月表示。予定は元のページの Schedule と同じ通信で取る。日曜と祝日は赤、今日は紫の四角 */
export function HomeCalendar({ client, onBack, today: given }: { client: MuscatClient; onBack: () => void; today?: Date }) {
  const [today] = useState(() => given ?? new Date()); // 描くたびに作り直すと、月の表も毎回作り直しになる
  const { month, events, loading, error, retry, move, goThisMonth, isThisMonth } = useMonthEvents(client, read, today);
  const [shown, setShown] = useState<string | null>(null);
  const grid = useMemo(() => monthGrid(month, today), [month, today]);
  const byDate = useMemo(() => groupEvents(events), [events]);
  return (
    <section className="rounded-[4px] border border-border bg-card">
      <div className="flex items-center gap-3 border-b border-border px-4 py-2.5">
        {/* 押す前の通信(予定の読み込み)と重ならないよう、読み込み中は戻れない */}
        <button type="button" disabled={loading} onClick={onBack} className="inline-flex cursor-pointer items-center border-0 bg-transparent p-0 text-[12.5px] text-primary hover:underline disabled:cursor-default disabled:opacity-60 max-[767px]:h-11">
          <IconChevronLeft size={16} />
          ホームに戻る
        </button>
        <h2 className="m-0 text-[15px] font-bold">カレンダー</h2>
      </div>
      <div className="flex flex-wrap items-center gap-2.5 px-4 py-3">
        <Button variant="secondary" label="前の月" disabled={loading} onClick={() => move(-1)}><IconChevronLeft size={16} /></Button>
        <b className="min-w-28 text-center text-lg">{`${month.getFullYear()}年${month.getMonth() + 1}月`}</b>
        <Button variant="secondary" label="次の月" disabled={loading} onClick={() => move(1)}><IconChevronRight size={16} /></Button>
        <Button variant="secondary" disabled={loading || isThisMonth} onClick={goThisMonth}>今月</Button>
        <span className="flex-1 max-[767px]:hidden" />
        <span className="flex flex-wrap gap-3 max-[767px]:w-full">
          <Legend swatch="bg-primary" text="大学の行事" />
          <Legend swatch="border border-[#C9B6DC]" text="掲示" />
          <Legend swatch="bg-muted" text="授業・予定" />
        </span>
      </div>
      {error && <div className="px-4 pb-3"><ErrorNotice title="予定を読み込めませんでした" message={error} onRetry={retry} /></div>}
      <BusyOverlay busy={loading}>
        <div className="grid grid-cols-7 border-t border-border">
          {WEEK.map((d, i) => (
            <div key={d} className={`border-b border-border bg-muted p-1.5 text-center text-xs font-semibold ${i === 0 ? "text-error" : "text-muted-foreground"}`}>{d}</div>
          ))}
          {grid.map((d, i) => {
            const list = d.other ? [] : (byDate.get(d.date) ?? []);
            const red = !d.other && (i % 7 === 0 || list.some((e) => e.kind === "holiday"));
            return (
              <div key={d.date} className={`flex min-h-[92px] min-w-0 flex-col gap-0.5 border-b border-[#ECE9EF] px-1.5 py-1 max-[767px]:relative max-[767px]:min-h-14 ${i % 7 !== 6 ? "border-r" : ""} ${d.other ? "bg-[#FAF9FB]" : ""}`}>
                <span
                  className={`self-start text-xs tabular-nums ${
                    d.today ? "rounded-[3px] bg-primary px-1.5 font-semibold text-primary-foreground" : d.other ? "text-[#B8B2BF]" : red ? "font-semibold text-error" : "text-muted-foreground"
                  }`}
                >
                  {d.day}
                </span>
                {list.slice(0, MAX).map((e, j) => (
                  <span key={j} title={label(e)} className={`truncate rounded-[2px] px-1 text-[11px] leading-[1.5] max-[767px]:hidden ${STYLE[e.kind]}`}>{label(e)}</span>
                ))}
                {list.length > MAX && (
                  <button type="button" onClick={() => setShown(d.date)} className="cursor-pointer border-0 bg-transparent p-0 text-left text-[11px] text-primary hover:underline max-[767px]:hidden">
                    {`ほか ${list.length - MAX} 件`}
                  </button>
                )}
                {/* 狭い画面は予定の文字を出さないので、点を付けて、マス全体を押すとその日の一覧を開く */}
                {list.length > 0 && (
                  <>
                    <span aria-hidden="true" className="size-1.5 rounded-full bg-primary min-[768px]:hidden" />
                    <button type="button" aria-label={`${d.day}日 予定 ${list.length} 件`} onClick={() => setShown(d.date)} className="absolute inset-0 cursor-pointer border-0 bg-transparent p-0 min-[768px]:hidden" />
                  </>
                )}
              </div>
            );
          })}
        </div>
      </BusyOverlay>
      {shown && <DayEventsDialog date={shown} events={byDate.get(shown) ?? []} rowClass={(e) => STYLE[e.kind]} rowText={label} onClose={() => setShown(null)} />}
    </section>
  );
}
