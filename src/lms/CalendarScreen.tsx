import { useCallback, useEffect, useRef, useState } from "react";
import { ErrorNotice } from "@/ui/ErrorNotice";
import { PageLoading } from "@/ui/PageLoading";
import { LoginRequiredError } from "./api";
import { loadMonth, monthOf, type CalEvent, type CalMonth } from "./calendar";
import { Box, Note } from "./parts";

const WEEK = "日月火水木金土";

const LATE = "border-[#E7B4B0] bg-[#FBEAEA] text-error";
const PAST = "border-border bg-muted text-muted-foreground";
const FUTURE = "border-border bg-sidebar-accent text-sidebar-accent-foreground";
const NAV = "h-9 max-[639px]:h-11 max-[639px]:min-w-11 cursor-pointer rounded-[4px] border border-border bg-card px-3 text-[13.5px] hover:bg-muted";

const hhmm = (s: number): string => {
  const d = new Date(s * 1000);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};

function Chip({ e }: { e: CalEvent }) {
  const label = `${hhmm(e.at)} ${e.name}`;
  return (
    <a href={e.url} title={[label, e.course].filter(Boolean).join("、")} className={`block truncate rounded-[3px] border px-1 text-[11.5px] leading-[18px] hover:underline ${e.late ? LATE : e.past ? PAST : FUTURE}`}>{label}</a>
  );
}

type Props = { search?: string; initial?: CalMonth; now?: Date };

/** カレンダー(月)。月の切り替えは画面内で、URL の ?time= を書き換える */
export function CalendarScreen({ search = "", initial, now = new Date() }: Props) {
  const [ym, setYm] = useState(() => (initial ? { year: initial.year, month: initial.month } : monthOf(search, now)));
  const [data, setData] = useState<CalMonth | null>(initial ?? null);
  const [failed, setFailed] = useState(false);
  const [course, setCourse] = useState(0);
  const load = useCallback((cancelled: () => boolean) => {
    setData(null);
    setFailed(false);
    loadMonth(ym.year, ym.month, Math.floor(Date.now() / 1000)).then(
      (d) => { if (!cancelled()) setData(d); },
      (e) => { if (e instanceof LoginRequiredError) location.reload(); else if (!cancelled()) { console.error("[mu-lms]", e); setFailed(true); } },
    );
  }, [ym]);
  const seeded = useRef(!!initial); // 渡された月は最初の 1 回だけ読み込まない
  useEffect(() => {
    if (seeded.current) { seeded.current = false; return; }
    let stop = false;
    load(() => stop);
    return () => { stop = true; };
  }, [load]);

  const go = (year: number, month: number) => {
    const d = new Date(year, month - 1, 1);
    setYm({ year: d.getFullYear(), month: d.getMonth() + 1 });
    try { history.replaceState(null, "", `/calendar/view.php?view=month&time=${Math.floor(d.getTime() / 1000)}`); } catch { /* 書き換えられなくても画面は動く */ }
  };

  const bar = (
    <div className="flex flex-wrap items-center gap-2">
      <button type="button" aria-label="前の月" className={NAV} onClick={() => go(ym.year, ym.month - 1)}>‹</button>
      <h1 className="m-0 min-w-[8rem] text-center text-lg font-semibold">{`${ym.year}年${ym.month}月`}</h1>
      <button type="button" aria-label="次の月" className={NAV} onClick={() => go(ym.year, ym.month + 1)}>›</button>
      <button type="button" className={NAV} onClick={() => go(now.getFullYear(), now.getMonth() + 1)}>今日</button>
    </div>
  );
  if (failed) return <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-4 p-4">{bar}<ErrorNotice title="読み込めませんでした" message="カレンダーを取得できませんでした。" onRetry={() => load(() => false)} /></div>;
  if (!data) return <PageLoading title="カレンダー" />;

  const courses = new Map<number, string>();
  for (const w of data.weeks) for (const d of w) for (const e of d?.events ?? []) if (e.courseId !== null) courses.set(e.courseId, e.course);
  const shown = (d: NonNullable<(typeof data.weeks)[number][number]>) => d.events.filter((e) => !course || e.courseId === course);
  const days = data.weeks.flat().flatMap((d) => (d ? [{ ...d, events: shown(d) }] : [])).filter((d) => d.events.length);

  return (
    <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-4 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {bar}
        <select aria-label="コース" value={course} onChange={(e) => setCourse(Number(e.target.value))} className="h-9 max-[639px]:h-11 max-w-full rounded-[4px] border border-input bg-card px-2 text-[13.5px]">
          <option value={0}>すべてのコース</option>
          {course && !courses.has(course) ? <option value={course}>選んだコース</option> : null}
          {[...courses].map(([id, name]) => <option key={id} value={id}>{name}</option>)}
        </select>
      </div>
      <div className="min-[640px]:hidden">
        <Box title="予定">
          {days.length ? (
            <ul className="m-0 list-none p-0">
              {days.map((d) => (
                <li key={d.mday} className="border-b border-border last:border-b-0">
                  <h3 className="m-0 flex items-center gap-2 bg-muted px-4 py-1.5 text-[13px] font-semibold">
                    {`${data.month}月${d.mday}日(${WEEK[new Date(data.year, data.month - 1, d.mday).getDay()]})`}
                    {d.today ? <span className="rounded-[3px] bg-primary px-1.5 text-[11.5px] font-semibold text-primary-foreground">今日</span> : null}
                  </h3>
                  <ul className="m-0 list-none p-0">
                    {d.events.map((e) => (
                      <li key={e.id}>
                        <a href={e.url} className={`flex min-h-11 flex-col justify-center border-l-4 px-4 py-1.5 text-[13px] hover:underline ${e.late ? LATE : e.past ? PAST : FUTURE}`}>
                          <span>{`${hhmm(e.at)} ${e.name}`}</span>
                          {e.course ? <span className="text-[11.5px] opacity-80">{e.course}</span> : null}
                        </a>
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          ) : <Note>この月の予定はありません</Note>}
        </Box>
      </div>
      <div className="max-[639px]:hidden">
      <Box title="予定">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] table-fixed border-collapse text-[13px]">
            <thead>
              <tr>{data.dayNames.map((n) => <th key={n} className="border-b border-border bg-muted p-1.5 font-semibold">{n}</th>)}</tr>
            </thead>
            <tbody>
              {data.weeks.map((w, i) => (
                <tr key={i}>
                  {w.map((d, j) => (
                    <td key={j} className={`h-24 border-b border-border p-1 align-top ${j ? "border-l" : ""}`}>
                      {d ? (
                        <>
                          <span className={`mb-1 grid size-6 place-items-center rounded-full text-[12px] ${d.today ? "bg-primary font-semibold text-primary-foreground" : "text-muted-foreground"}`}>{d.mday}</span>
                          <div className="flex flex-col gap-0.5">{shown(d).map((e) => <Chip key={e.id} e={e} />)}</div>
                        </>
                      ) : null}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="m-0 flex flex-wrap gap-x-4 gap-y-1 border-t border-border px-4 py-2 text-[11.5px] text-muted-foreground">
          <span className="flex items-center gap-1.5"><i className={`inline-block size-3 rounded-[2px] border ${LATE}`} />期限切れ・未提出</span>
          <span className="flex items-center gap-1.5"><i className={`inline-block size-3 rounded-[2px] border ${PAST}`} />過去</span>
          <span className="flex items-center gap-1.5"><i className={`inline-block size-3 rounded-[2px] border ${FUTURE}`} />これから</span>
        </p>
      </Box>
      </div>
    </div>
  );
}
