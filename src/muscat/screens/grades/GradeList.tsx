import type { GradeCourse, GradeEntry } from "@/muscat/api/types";
import { Card } from "@/ui/Card";
import { GradeRow } from "./GradeRow";

export type GradeView = "category" | "term";

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

export function GradeList({ entries, view }: { entries: GradeEntry[]; view: GradeView }) {
  const courses = entries.flatMap((e) => e.course ?? []);
  if (courses.length === 0) return <Card className="p-4">該当する科目はありません</Card>;
  if (view === "term") {
    return (
      <Card className="p-4">
        {groupByTerm(courses).map((g) => (
          <section key={g.label}>
            <h3 className="mt-2 text-sm font-bold text-muted-foreground">{g.label}</h3>
            <ul>{g.items.map((c, i) => <GradeRow key={i} course={c} />)}</ul>
          </section>
        ))}
      </Card>
    );
  }
  return (
    <Card className="p-4">
      {entries.map((e, i) => (
        <div key={i} style={{ paddingLeft: e.depth * 12 }}>
          {e.course ? (
            <ul><GradeRow course={e.course} showTerm /></ul>
          ) : (
            <h3 className="mt-2 text-sm font-bold text-muted-foreground">{e.name}</h3>
          )}
        </div>
      ))}
    </Card>
  );
}
