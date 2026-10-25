import { Fragment, useEffect, useRef } from "react";
import { IconInfoCircle } from "@tabler/icons-react";
import type { RoomBar, RoomResult, RoomRow } from "@/muscat/api/types";
import { Card } from "@/ui/Card";
import { HOUR_PX, NAME_PX, hhmm, kindColor } from "./roomKinds";

const LANE = 28;
const px = (min: number, from: number) => ((min - from) / 60) * HOUR_PX;
const laneCount = (r: RoomRow) => Math.max(1, ...r.bars.map((b) => b.lane + 1));

function Bar({ bar, from, to, rowH, lanes, i, onOpen }: { bar: RoomBar; from: number; to: number; rowH: number; lanes: number; i: number; onOpen: (b: RoomBar) => void }) {
  const c = kindColor(bar.kind);
  const start = Math.max(bar.start, from);
  const end = Math.min(bar.end, to);
  const h = lanes > 1 ? LANE - 4 : 36;
  const top = lanes > 1 ? 6 + bar.lane * LANE : (rowH - h) / 2;
  return (
    <button
      type="button"
      title={bar.title || bar.text}
      onClick={() => onOpen(bar)}
      className="mu-row absolute cursor-pointer truncate rounded-[2px] px-2 text-left text-xs font-bold"
      style={{ left: px(start, from), width: Math.max(4, px(end, from) - px(start, from) - 2), top, height: h, background: c.bg, color: c.fg, border: c.dashed ? `1px dashed ${c.fg}` : "0", "--i": i } as React.CSSProperties}
    >
      {bar.text}
    </button>
  );
}

/** 教室 × 時間のタイムライン。左の教室名と上の時刻見出しは貼り付き、縦横にスクロールする。予約・ⓘ を押すと押された教室を返す */
export function RoomTimeline({ result, jump, onOpen, onInfo }: { result: RoomResult; jump?: { date: string; n: number }; onOpen: (b: RoomBar, room: RoomRow) => void; onInfo: (room: RoomRow) => void }) {
  const { from, to, rooms } = result;
  const box = useRef<HTMLDivElement>(null);
  // 選んだ日の見出しへ縦にスクロールする(見出しは時刻の見出しの下に来るよう、その高さぶん手前)
  useEffect(() => {
    const head = jump?.date ? box.current?.querySelector<HTMLElement>(`[data-date="${CSS.escape(jump.date)}"]`) : null;
    // offsetTop は外側の枠からの位置で、行き過ぎて見出しが時刻の見出しの下に隠れた(実機で確認)。画面上の位置の差で測る
    const b = box.current;
    if (head && b) b.scrollTo({ top: b.scrollTop + head.getBoundingClientRect().top - b.getBoundingClientRect().top - 33 });
  }, [jump]);
  const days = new Set(rooms.map((r) => r.date)).size;
  const width = px(to, from);
  const hours = Array.from({ length: Math.max(0, Math.round((to - from) / 60)) }, (_, k) => from + k * 60);
  const grid = { backgroundImage: `repeating-linear-gradient(to right, transparent 0 ${HOUR_PX - 1}px, var(--border, #e5e7eb) ${HOUR_PX - 1}px ${HOUR_PX}px)` };
  let n = 0;
  return (
    <Card className="gap-0 overflow-hidden p-0">
      <div ref={box} className="max-h-[520px] overflow-auto">
        <div style={{ width: NAME_PX + width }}>
          <div className="sticky top-0 z-20 flex border-b border-border bg-card">
            <div className="sticky left-0 z-10 shrink-0 border-r border-border bg-card px-3 py-2 text-xs font-bold text-muted-foreground" style={{ width: NAME_PX }}>教室</div>
            <div className="relative h-8 shrink-0" style={{ width }}>
              {hours.map((m) => (
                <span key={m} className="absolute top-2 text-xs text-muted-foreground" style={{ left: px(m, from) + 4 }}>{hhmm(m)}</span>
              ))}
            </div>
          </div>
          {rooms.map((r, k) => {
            const lanes = laneCount(r);
            const rowH = lanes > 1 ? lanes * LANE + 12 : 52;
            return (
              <Fragment key={`${r.date}|${r.name}|${k}`}>
              {r.date !== rooms[k - 1]?.date && <div data-date={r.date} className="sticky left-0 w-fit bg-muted px-3 py-1 text-xs font-bold">{r.date}</div>}
              <div className="flex border-b border-border" style={{ height: rowH }}>
                <div className="sticky left-0 z-10 flex shrink-0 items-center gap-1 border-r border-border bg-card px-3" style={{ width: NAME_PX }}>
                  <span className="min-w-0 flex-1 truncate text-sm font-bold">{r.name}</span>
                  {r.capacity && <span className="shrink-0 text-xs text-muted-foreground">{r.capacity}</span>}
                  <button type="button" aria-label={`${r.name}の情報`} onClick={() => onInfo(r)} className="shrink-0 cursor-pointer border-0 bg-transparent p-0 text-muted-foreground hover:text-primary">
                    <IconInfoCircle className="size-4" />
                  </button>
                </div>
                <div className="relative shrink-0" style={{ width, ...grid }}>
                  {/* 印は中身から作る。元の部品の ref は、元の画面が教室を描き足すたびに替わり、帯が作り直されてちらついた(実機で確認) */}
                  {r.bars.map((b) => <Bar key={`${b.start}:${b.end}:${b.lane}:${b.text}`} bar={b} from={from} to={to} rowH={rowH} lanes={lanes} i={n++} onOpen={(bar) => onOpen(bar, r)} />)}
                </div>
              </div>
              </Fragment>
            );
          })}
        </div>
      </div>
      <div className="border-t border-border px-3.5 py-2 text-[13px] text-muted-foreground">{`${days > 1 ? `${Math.round(rooms.length / days)} 教室 × ${days} 日` : `${rooms.length} 教室`} · ${hhmm(from)} から ${hhmm(to - 60)}`}</div>
    </Card>
  );
}
