import { IconChevronLeft, IconChevronRight } from "@tabler/icons-react";
import { useEffect, useRef, useState } from "react";
import { Spin } from "@/ui/Spin";
import type { CalendarData } from "../data";
import { buildMonthGrid, shortLabel, type Cat, type CalEvent } from "../lib/lib";

// 分類ごとの色(地, 文字)
const COLOR: Record<Cat, [string, string]> = {
  class: ["#6B3FA0", "#fff"],
  off: ["#C62F3A", "#fff"],
  event: ["#F5B83D", "#3B2A00"],
  reg: ["#2E7D4F", "#fff"],
  exam: ["#1E6FBF", "#fff"],
};
const LEGEND: [Cat, string][] = [["class", "授業"], ["off", "祝日・休み"], ["event", "イベント"], ["reg", "履修登録"], ["exam", "試験・補講"]];
const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];

type Props = { data: CalendarData; load: (y: number, m: number) => Promise<CalEvent[]>; now?: Date };

/** 学年暦。月を移るたびに取り、同じ月は取り直さない。取っている間は薄くして輪を重ね、レイアウトを動かさない */
export function AcademicCalendar({ data, load, now = new Date() }: Props) {
  const [ym, setYm] = useState({ y: now.getFullYear(), m: now.getMonth() + 1 });
  const cache = useRef(new Map<string, CalEvent[]>());
  const key = `${ym.y}-${ym.m}`;
  if (data.first && !cache.current.size) cache.current.set(`${now.getFullYear()}-${now.getMonth() + 1}`, data.first);
  // 取っている間は前の月の表示(年月も一緒に)を残す
  const [shown, setShown] = useState<{ y: number; m: number; events: CalEvent[] | null }>({ ...ym, events: data.first });
  const { events } = shown;
  const [busy, setBusy] = useState(false);
  const seq = useRef(0);

  useEffect(() => {
    const hit = cache.current.get(key);
    const my = ++seq.current;
    if (hit) { setShown({ ...ym, events: hit }); setBusy(false); return; }
    setBusy(true);
    load(ym.y, ym.m)
      .then((evs) => { cache.current.set(key, evs); if (my === seq.current) setShown({ ...ym, events: evs }); })
      .catch((e) => { console.error("[mu-portal]", e); if (my === seq.current) setShown({ ...ym, events: null }); })
      .finally(() => { if (my === seq.current) setBusy(false); });
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps

  const move = (n: number) => setYm(({ y, m }) => {
    const t = m - 1 + n;
    return { y: y + Math.floor(t / 12), m: ((t % 12) + 12) % 12 + 1 };
  });
  const todayKey = now.getFullYear() * 10000 + (now.getMonth() + 1) * 100 + now.getDate();
  const weeks = events ? buildMonthGrid(events, shown.y, shown.m, todayKey) : [];
  const arrow = "flex size-7 cursor-pointer items-center justify-center rounded-[4px] border border-border bg-card text-foreground hover:bg-muted";

  // 週ごとに「日付の行 + バーのレーン」を縦に積む
  let row = 1;
  const placed = weeks.map((w, i) => {
    const r = row;
    row += 1 + w.lanes;
    return { w, r, i };
  });

  return (
    <section className="overflow-hidden rounded-[4px] border border-border bg-card text-card-foreground">
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-2.5">
        <h2 className="m-0 text-sm font-semibold">{data.header}</h2>
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-semibold">{`${shown.y}年${shown.m}月`}</span>
          <button type="button" aria-label="前の月" className={arrow} onClick={() => move(-1)}><IconChevronLeft className="size-4" /></button>
          <button type="button" aria-label="次の月" className={arrow} onClick={() => move(1)}><IconChevronRight className="size-4" /></button>
        </div>
      </div>
      <div className="relative px-3 pt-2 pb-1">
        <div className="grid grid-cols-7 pb-1 text-center text-[12px] text-muted-foreground">
          {WEEKDAYS.map((d, i) => <span key={d} className={i === 0 ? "text-error" : ""}>{d}</span>)}
        </div>
        <div
          className={`grid grid-cols-7 gap-y-px text-[12px] transition-opacity ${busy ? "opacity-40" : ""}`}
          style={{ gridAutoRows: "auto" }}
        >
          {events === null ? <p className="col-span-7 m-0 py-6 text-center text-muted-foreground">読み込めませんでした</p> : null}
          {placed.flatMap(({ w, r, i }) => [
            ...w.cells.map((c) => (
              <div key={c.key} className={`text-center ${i ? "mt-2.5" : ""} ${c.weekend === "sun" ? "text-error" : ""}`} style={{ gridColumn: c.col, gridRow: r }}>
                {c.today
                  ? <span className="inline-flex size-6 items-center justify-center rounded-full bg-primary font-semibold text-primary-foreground">{c.day}</span>
                  : <span className="inline-block leading-6">{c.day}</span>}
              </div>
            )),
            ...w.bars.map((b, j) => (
              <div
                key={`${r}-${j}`}
                title={b.summary}
                className={`mx-px mt-0.5 overflow-hidden text-ellipsis whitespace-nowrap px-1 text-[11px] leading-[18px] ${b.left ? "rounded-l-[3px]" : ""} ${b.right ? "rounded-r-[3px]" : ""}`}
                style={{ gridColumn: `${b.c1} / span ${b.c2 - b.c1 + 1}`, gridRow: r + 1 + b.lane, background: COLOR[b.cat][0], color: COLOR[b.cat][1] }}
              >
                {b.c1 === b.c2 ? shortLabel(b.summary) : b.summary}
              </div>
            )),
          ])}
        </div>
        {busy ? <div className="pointer-events-none absolute inset-0 flex items-center justify-center"><Spin /></div> : null}
      </div>
      <ul className="m-0 flex list-none flex-wrap gap-x-4 gap-y-1 border-t border-border px-4 py-2 text-[12px] text-muted-foreground">
        {LEGEND.map(([c, name]) => (
          <li key={c} className="flex items-center gap-1.5">
            <i className="inline-block size-2.5 rounded-[2px]" style={{ background: COLOR[c][0] }} />
            {name}
          </li>
        ))}
      </ul>
    </section>
  );
}
