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
      className="mu-row absolute cursor-pointer truncate rounded-md px-2 text-left text-xs font-bold"
      style={{ left: px(start, from), width: Math.max(4, px(end, from) - px(start, from) - 2), top, height: h, background: c.bg, color: c.fg, "--i": i } as React.CSSProperties}
    >
      {bar.text}
    </button>
  );
}

/** 教室 × 時間のタイムライン。左の教室名と上の時刻見出しは貼り付き、縦横にスクロールする。予約を押すと元の画面のリンクを押す */
export function RoomTimeline({ result, onOpen, onInfo }: { result: RoomResult; onOpen: (b: RoomBar) => void; onInfo: (ref: string) => void }) {
  const { from, to, rooms } = result;
  const width = px(to, from);
  const hours = Array.from({ length: Math.max(0, Math.round((to - from) / 60)) }, (_, k) => from + k * 60);
  const grid = { backgroundImage: `repeating-linear-gradient(to right, transparent 0 ${HOUR_PX - 1}px, var(--border, #e5e7eb) ${HOUR_PX - 1}px ${HOUR_PX}px)` };
  let n = 0;
  return (
    <Card className="gap-0 overflow-hidden p-0">
      <div className="max-h-[520px] overflow-auto">
        <div style={{ width: NAME_PX + width }}>
          <div className="sticky top-0 z-20 flex border-b border-border bg-card">
            <div className="sticky left-0 z-10 shrink-0 border-r border-border bg-card px-3 py-2 text-xs font-bold text-muted-foreground" style={{ width: NAME_PX }}>教室</div>
            <div className="relative h-8 shrink-0" style={{ width }}>
              {hours.map((m) => (
                <span key={m} className="absolute top-2 text-xs text-muted-foreground" style={{ left: px(m, from) + 4 }}>{hhmm(m)}</span>
              ))}
            </div>
          </div>
          <div className="sticky left-0 w-fit bg-muted px-3 py-1 text-xs font-bold">{result.date}</div>
          {rooms.map((r) => {
            const lanes = laneCount(r);
            const rowH = lanes > 1 ? lanes * LANE + 12 : 52;
            return (
              <div key={r.name} className="flex border-b border-border" style={{ height: rowH }}>
                <div className="sticky left-0 z-10 flex shrink-0 items-center gap-1 border-r border-border bg-card px-3" style={{ width: NAME_PX }}>
                  <span className="min-w-0 flex-1 truncate text-sm font-bold">{r.name}</span>
                  {r.capacity && <span className="shrink-0 text-xs text-muted-foreground">{r.capacity}</span>}
                  {r.infoRef && (
                    <button type="button" aria-label={`${r.name}の情報`} onClick={() => onInfo(r.infoRef)} className="shrink-0 cursor-pointer text-muted-foreground hover:text-primary">
                      <IconInfoCircle className="size-4" />
                    </button>
                  )}
                </div>
                <div className="relative shrink-0" style={{ width, ...grid }}>
                  {r.bars.map((b) => <Bar key={b.openRef || `${b.start}:${b.lane}:${b.text}`} bar={b} from={from} to={to} rowH={rowH} lanes={lanes} i={n++} onOpen={onOpen} />)}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <div className="border-t border-border px-3.5 py-2 text-[13px] text-muted-foreground">{`${rooms.length} 教室 · ${hhmm(from)} から ${hhmm(to - 60)}`}</div>
    </Card>
  );
}
