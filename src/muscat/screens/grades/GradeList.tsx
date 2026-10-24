import type { GradeCourse, GradeEntry } from "@/muscat/api/types";
import { EmptyState } from "@/ui/EmptyState";

export type GradeView = "category" | "term";
export type GradeCols = { gpa: boolean; gpaYear: boolean };

const termNo = (t: string) => Number(/\d+/.exec(t)?.[0] ?? 0);

/** 授業だけを年度・学期でまとめる。新しい年度学期が上、年度の無い授業は最後 */
function groupByTerm(courses: GradeCourse[]) {
  const groups = new Map<string, { year: number; no: number; label: string; items: GradeCourse[] }>();
  for (const c of courses) {
    const key = `${c.year}|${c.term}`;
    const g = groups.get(key) ?? {
      year: c.year ?? -1,
      no: termNo(c.term),
      label: c.year === null ? "年度なし" : `${c.year}年度 ${c.term}`,
      items: [],
    };
    g.items.push(c);
    groups.set(key, g);
  }
  return [...groups.values()].sort((a, b) => b.year - a.year || b.no - a.no);
}

type Row = { head: string; parent?: string; depth: number } | { course: GradeCourse; depth: number };

function buildRows(entries: GradeEntry[], view: GradeView): Row[] {
  if (view === "term") {
    return groupByTerm(entries.flatMap((e) => e.course ?? [])).flatMap((g): Row[] => [
      { head: g.label, depth: 0 },
      ...g.items.map((course) => ({ course, depth: 1 })),
    ]);
  }
  const names: string[] = []; // depth ごとの直前の見出し
  return entries.map((e): Row => {
    if (e.course) return { course: e.course, depth: e.depth };
    names[e.depth] = e.name;
    return { head: e.name, parent: e.depth > 0 ? names[e.depth - 1] : undefined, depth: e.depth };
  });
}

const isBad = (g: string) => g === "D" || g === "X" || g === "不可";
const indent = (depth: number) => ({ paddingLeft: 10 + depth * 16 });

function Grade({ course, size }: { course: GradeCourse; size: string }) {
  if (!course.grade) return <span className="text-[11.5px] text-primary">履修中</span>;
  return <span className={`font-bold ${size} ${isBad(course.grade) ? "text-error" : ""}`}>{course.grade}</span>;
}

const th = "px-2 py-2 font-normal";
const td = "px-2 py-1.5";

function Table({ rows, cols }: { rows: Row[]; cols: GradeCols }) {
  const span = 6 + Number(cols.gpa) + Number(cols.gpaYear);
  return (
    <div className="overflow-x-auto max-[767px]:hidden">
      <table className="w-full min-w-[900px] border-collapse text-[13px]">
        <thead>
          <tr className="bg-muted text-left text-xs text-muted-foreground">
            <th className={th}>科目</th>
            <th className={`${th} text-right`}>単位</th>
            <th className={`${th} text-center`}>評価</th>
            {cols.gpa && <th className={`${th} text-center`}>GPA対象</th>}
            {cols.gpaYear && <th className={`${th} text-center`}>GPA対象(年度毎)</th>}
            <th className={th}>年度</th>
            <th className={th}>学期</th>
            <th className={th}>教員</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) =>
            "head" in r ? (
              <tr key={i} className="border-t border-border bg-muted/50">
                <td colSpan={span} className="py-1.5 pr-2 text-[12.5px] font-bold text-muted-foreground" style={indent(r.depth)}>
                  {r.head}
                </td>
              </tr>
            ) : (
              <tr key={i} className="border-t border-border">
                <td className={td} style={indent(r.depth)}>
                  {r.course.name}
                  <Online course={r.course} />
                </td>
                <td className={`${td} text-right tabular-nums`}>{r.course.credits === null ? "" : r.course.credits.toFixed(1)}</td>
                <td className={`${td} text-center`}><Grade course={r.course} size="" /></td>
                {cols.gpa && <td className={`${td} text-center text-muted-foreground`}>{r.course.gpaTarget ? "○" : ""}</td>}
                {cols.gpaYear && <td className={`${td} text-center text-muted-foreground`}>{r.course.gpaTargetYear ? "○" : ""}</td>}
                <td className={`${td} tabular-nums`}>{r.course.year ?? ""}</td>
                <td className={td}>{r.course.term}</td>
                <td className={td}>{r.course.teacher}</td>
              </tr>
            ),
          )}
        </tbody>
      </table>
    </div>
  );
}

// 記号(* や ※)は説明が要るので、オンラインは札で出す。履修中は評価の欄に出ている
const Online = ({ course }: { course: GradeCourse }) =>
  course.online ? <span className="ml-2 inline-block rounded-[4px] border border-border px-1.5 text-[11px] leading-[18px] text-muted-foreground">オンライン</span> : null;

function Cards({ rows }: { rows: Row[] }) {
  return (
    <ul className="m-0 list-none p-0 min-[768px]:hidden">
      {rows.map((r, i) =>
        "head" in r ? (
          <li key={i} className="border-t border-border bg-muted/50 px-3 py-1.5 text-[12.5px] font-bold text-muted-foreground first:border-t-0">
            {r.parent ? `${r.parent} › ${r.head}` : r.head}
          </li>
        ) : (
          <li key={i} className="flex items-center justify-between gap-3 border-t border-border px-3 py-2 first:border-t-0">
            <div className="min-w-0">
              <p className="m-0 text-[13px]">{r.course.name}
                <Online course={r.course} /></p>
              <p className="m-0 text-xs text-muted-foreground">
                {[r.course.year === null ? "" : `${r.course.year} ${r.course.term}`, r.course.credits === null ? "" : `${r.course.credits.toFixed(1)} 単位`].filter(Boolean).join("、")}
              </p>
            </div>
            <Grade course={r.course} size="text-[17px]" />
          </li>
        ),
      )}
    </ul>
  );
}

export function GradeList({ entries, view, cols }: { entries: GradeEntry[]; view: GradeView; cols: GradeCols }) {
  const rows = buildRows(entries, view);
  const empty = !rows.some((r) => "course" in r);
  return (
    <section className="overflow-hidden rounded-[4px] border border-border bg-card">
      {empty ? (
        <EmptyState title="該当する科目はありません" />
      ) : (
        <>
          <Table rows={rows} cols={cols} />
          <Cards rows={rows} />
        </>
      )}
    </section>
  );
}
