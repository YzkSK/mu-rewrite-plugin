import { useCallback, useEffect, useState } from "react";
import { courseName } from "@/portal/lib/lms";
import { ErrorNotice } from "@/ui/ErrorNotice";
import { PageLoading } from "@/ui/PageLoading";
import { LoginRequiredError } from "./api";
import { loadCourses, placeCourses, termOfMonth, type MyCourse } from "./courses";
import { useSlots, type SlotMap } from "./muscatSlots";
import { Box, Note, Row } from "./parts";

const DAYS = ["月", "火", "水", "木", "金", "土"];

function List({ title, list }: { title: string; list: MyCourse[] }) {
  if (!list.length) return null;
  return (
    <Box title={title}>
      <ul className="m-0 list-none p-0">
        {list.map((c) => <Row key={c.id}><a className="min-w-0 flex-1 text-[13.5px] text-foreground hover:underline [overflow-wrap:anywhere]" href={c.url}>{courseName(c.name)}</a></Row>)}
      </ul>
    </Box>
  );
}

type Props = { initial?: MyCourse[]; now?: Date; initialSlots?: SlotMap | null };

/** マイコース。学期を選ぶと、月〜土 × 1〜7 限の表にコースを置く。MUSCAT の対応表は後から届いて描き直す */
export function CoursesScreen({ initial, now = new Date(), initialSlots }: Props) {
  const slots = useSlots(initialSlots);
  const [courses, setCourses] = useState<MyCourse[] | null>(initial ?? null);
  const [failed, setFailed] = useState(false);
  const [day, setDay] = useState(now.getDay() || 1); // 日曜は月
  const [term, setTerm] = useState(termOfMonth(now.getMonth() + 1));
  const load = useCallback(() => {
    setCourses(null);
    setFailed(false);
    loadCourses().then(setCourses, (e) => { if (e instanceof LoginRequiredError) location.reload(); else { console.error("[mu-lms]", e); setFailed(true); } });
  }, []);
  useEffect(() => { if (!initial) load(); }, [initial, load]);

  if (failed) return <div className="p-4"><ErrorNotice title="読み込めませんでした" message="コースの一覧を取得できませんでした。" onRetry={load} /></div>;
  if (!courses) return <PageLoading title="マイコース" />;

  const p = placeCourses(courses, term, slots);
  const dayRows = [1, 2, 3, 4, 5, 6, 7].flatMap((period) =>
    (p.grid[`${day}-${period}`] ?? []).map(({ course: c, rows }) => ({
      key: `${period}-${c.id}`,
      label: `${Array.from({ length: rows }, (_, k) => period + k).join("・")}限`,
      c,
    })),
  );
  return (
    <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-4 p-4">
      <div role="group" aria-label="学期" className="flex w-fit overflow-hidden rounded-[4px] border border-border">
        {[1, 2, 3, 4].map((t) => (
          <button key={t} type="button" aria-pressed={t === term} onClick={() => setTerm(t)} className={`h-9 max-[639px]:h-11 cursor-pointer border-r border-border px-4 text-[13.5px] last:border-r-0 ${t === term ? "bg-primary text-primary-foreground" : "bg-card hover:bg-muted"}`}>{`${t}学期`}</button>
        ))}
      </div>
      <div className="min-[640px]:hidden">
        <Box title="時間割">
          <div role="group" aria-label="曜日" className="flex border-b border-border">
            {DAYS.map((d, i) => (
              <button key={d} type="button" aria-pressed={i + 1 === day} onClick={() => setDay(i + 1)} className={`min-h-11 flex-1 cursor-pointer border-r border-border text-[13.5px] last:border-r-0 ${i + 1 === day ? "bg-primary text-primary-foreground" : "bg-card hover:bg-muted"}`}>{d}</button>
            ))}
          </div>
          {dayRows.length ? (
            <ul className="m-0 list-none p-0">
              {dayRows.map(({ key, label, c }) => (
                <Row key={key}>
                  <span className="w-14 shrink-0 py-2 text-[13px] text-muted-foreground">{label}</span>
                  <a href={c.url} className="flex min-h-11 min-w-0 flex-1 items-center text-[13.5px] text-foreground hover:underline [overflow-wrap:anywhere]">{courseName(c.name)}</a>
                </Row>
              ))}
            </ul>
          ) : <Note>この曜日の授業はありません</Note>}
        </Box>
      </div>
      <div className="max-[639px]:hidden">
      <Box title="時間割">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] table-fixed border-collapse text-[13px]">
            <thead>
              <tr>
                <th className="w-12 border-b border-border bg-muted p-1.5" />
                {DAYS.map((d) => <th key={d} className="border-b border-l border-border bg-muted p-1.5 font-semibold">{d}</th>)}
              </tr>
            </thead>
            <tbody>
              {[1, 2, 3, 4, 5, 6, 7].map((period) => (
                <tr key={period}>
                  <th className="border-b border-border bg-muted p-1.5 font-semibold text-muted-foreground">{`${period}限`}</th>
                  {DAYS.map((d, i) => {
                    const key = `${i + 1}-${period}`;
                    if (p.covered.has(key)) return null;
                    const cells = p.grid[key] ?? [];
                    return (
                      <td key={d} rowSpan={Math.max(1, ...cells.map((x) => x.rows))} className="h-14 border-b border-l border-border p-1.5 align-top">
                        {cells.map(({ course: c }) => <a key={c.id} href={c.url} className="block text-foreground hover:underline [overflow-wrap:anywhere]">{courseName(c.name)}</a>)}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Box>
      </div>
      <List title="曜日・時限の無いコース" list={p.noSlot} />
      <List title="そのほか" list={p.other} />
      {!courses.length ? <Box title="コース"><Note>登録されているコースはありません</Note></Box> : null}
    </div>
  );
}
