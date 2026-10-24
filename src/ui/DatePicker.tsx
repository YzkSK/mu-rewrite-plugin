import { useEffect, useRef, useState } from "react";

type Props = {
  /** "2026/10/25" の形。読めなければ今日の月を開く */
  value: string;
  label: string;
  disabled?: boolean;
  onChange: (value: string) => void;
  /** 今日の印。テスト用 */
  today?: Date;
};

const WEEK = ["日", "月", "火", "水", "木", "金", "土"];
const pad = (n: number) => String(n).padStart(2, "0");
const fmt = (y: number, m: number, d: number) => `${y}/${pad(m + 1)}/${pad(d)}`;

export function parseYmd(value: string): { y: number; m: number; d: number } | null {
  const r = /^(\d{4})\/(\d{1,2})\/(\d{1,2})$/.exec(value.trim());
  return r ? { y: Number(r[1]), m: Number(r[2]) - 1, d: Number(r[3]) } : null;
}

/** 月のマス(前後の月の日は null)。日曜始まり */
export function monthCells(y: number, m: number): (number | null)[] {
  const first = new Date(y, m, 1).getDay();
  const days = new Date(y, m + 1, 0).getDate();
  const cells: (number | null)[] = Array.from({ length: first }, () => null);
  for (let d = 1; d <= days; d++) cells.push(d);
  while (cells.length % 7) cells.push(null);
  return cells;
}

/** 欄を押すと下に月のカレンダーが開く日付の選び方(ブラウザ標準の date 入力の代わり) */
export function DatePicker({ value, label, disabled, onChange, today = new Date() }: Props) {
  const sel = parseYmd(value);
  const [open, setOpen] = useState(false);
  const [view, setView] = useState(() => ({ y: sel?.y ?? today.getFullYear(), m: sel?.m ?? today.getMonth() }));
  const ref = useRef<HTMLDivElement>(null);

  // 枠の外を押すか Esc で閉じる(Shadow DOM の中でも届くよう composedPath で見る)
  useEffect(() => {
    if (!open) return;
    const down = (e: PointerEvent) => ref.current && !e.composedPath().includes(ref.current) && setOpen(false);
    const key = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", down);
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("pointerdown", down);
      document.removeEventListener("keydown", key);
    };
  }, [open]);

  const toggle = () => {
    if (!open && sel) setView({ y: sel.y, m: sel.m });
    setOpen(!open);
  };
  const step = (d: number) => setView(({ y, m }) => ({ y: m + d < 0 ? y - 1 : m + d > 11 ? y + 1 : y, m: (m + d + 12) % 12 }));
  const isToday = (d: number) => view.y === today.getFullYear() && view.m === today.getMonth() && d === today.getDate();
  const isSel = (d: number) => !!sel && view.y === sel.y && view.m === sel.m && d === sel.d;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-label={label}
        aria-expanded={open}
        disabled={disabled}
        onClick={toggle}
        className="flex h-8 min-w-36 cursor-pointer items-center justify-between gap-3 rounded-[4px] border border-input bg-card px-2.5 text-sm tabular-nums disabled:cursor-default disabled:opacity-60"
      >
        {value || "日付を選ぶ"}
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" className="text-muted-foreground">
          <rect x="3" y="5" width="18" height="16" rx="1" />
          <path d="M3 10h18M8 3v4M16 3v4" />
        </svg>
      </button>
      {open && (
        <div role="dialog" aria-label={label} className="absolute left-0 top-full z-40 mt-1 w-64 rounded-[4px] border border-border bg-card p-3 shadow-md">
          <div className="mb-2 flex items-center justify-between">
            <button type="button" aria-label="前の月" onClick={() => step(-1)} className="size-8 cursor-pointer rounded-[4px] border-0 bg-transparent hover:bg-muted">‹</button>
            <b className="text-sm">{`${view.y}年${view.m + 1}月`}</b>
            <button type="button" aria-label="次の月" onClick={() => step(1)} className="size-8 cursor-pointer rounded-[4px] border-0 bg-transparent hover:bg-muted">›</button>
          </div>
          <div className="grid grid-cols-7 gap-0.5 text-center text-xs">
            {WEEK.map((w, i) => (
              <span key={w} className={`py-1 ${i === 0 ? "text-error" : "text-muted-foreground"}`}>{w}</span>
            ))}
            {monthCells(view.y, view.m).map((d, i) =>
              d === null ? (
                <span key={i} />
              ) : (
                <button
                  key={i}
                  type="button"
                  aria-pressed={isSel(d)}
                  onClick={() => {
                    onChange(fmt(view.y, view.m, d));
                    setOpen(false);
                  }}
                  className={`h-8 cursor-pointer rounded-[4px] border-0 text-sm tabular-nums ${
                    isSel(d) ? "bg-primary font-bold text-primary-foreground" : `bg-transparent hover:bg-muted ${i % 7 === 0 ? "text-error" : ""}`
                  } ${isToday(d) && !isSel(d) ? "font-bold ring-1 ring-inset ring-primary" : ""}`}
                >
                  {d}
                </button>
              ),
            )}
          </div>
          <div className="mt-2 flex justify-end">
            <button
              type="button"
              onClick={() => {
                onChange(fmt(today.getFullYear(), today.getMonth(), today.getDate()));
                setOpen(false);
              }}
              className="cursor-pointer rounded-[4px] border-0 bg-transparent px-2 py-1 text-xs text-primary hover:bg-muted"
            >
              今日
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
