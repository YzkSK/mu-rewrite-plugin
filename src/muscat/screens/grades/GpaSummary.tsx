import type { GpaRow, Grades } from "@/muscat/api/types";
import { Card } from "@/ui/Card";

const show = (v: number | null) => (v === null ? "-" : v.toFixed(2));
const credit = (v: number | null) => (v === null ? "-" : v.toFixed(1));

function Big({ label, value }: { label: string; value: number | null }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-3xl font-bold text-primary">{show(value)}</p>
    </div>
  );
}

const Rows = ({ rows }: { rows: GpaRow[] }) => (
  <ul className="text-sm">
    {rows.map((r, i) => (
      <li key={i} className="flex justify-between border-b border-border py-1">
        <span>{r.label}</span>
        <span>{show(r.value)}</span>
      </li>
    ))}
  </ul>
);

export function GpaSummary({ gpa, totals }: Pick<Grades, "gpa" | "totals">) {
  const latest = [...gpa.cumulative].reverse().find((r) => r.value !== null)?.value ?? null;
  const overall = gpa.byYear.find((r) => r.label === "通算")?.value ?? null;
  const years = gpa.byYear.filter((r) => r.label !== "通算");
  return (
    <Card className="flex flex-col gap-3 p-4">
      <div className="flex gap-6">
        <Big label="総合GPA(最新)" value={latest} />
        <Big label="通算GPA" value={overall} />
      </div>
      {years.length > 0 && <Rows rows={years} />}
      {gpa.byTerm.length > 0 && (
        <details>
          <summary className="cursor-pointer text-sm">年度学期ごとのGPA</summary>
          <Rows rows={gpa.byTerm} />
        </details>
      )}
      <p className="text-sm text-muted-foreground">
        履修合計単位 {credit(totals.inProgress)} / オンライン {credit(totals.online)}
      </p>
    </Card>
  );
}
