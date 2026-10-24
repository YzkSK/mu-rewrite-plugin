import { useState, type ReactNode } from "react";
import type { GpaRow, Grades } from "@/muscat/api/types";
import { CreditTable } from "./CreditTable";

const gpa = (v: number | null | undefined) => (v == null ? "-" : v.toFixed(2));
const credit = (v: number | null | undefined) => (v == null ? "-" : v.toFixed(1));

const box = "rounded-[4px] border border-border bg-card";

/** 数字の帯。狭いと 2×2 */
export function GradeStats({ grades }: { grades: Grades }) {
  const { gpa: g, credits, totals } = grades;
  const total = credits.find((r) => r.name.replace(/\s/g, "") === "総合計"); // depth 0 は「教養」などの分類のこともあるので、総合計が無ければ出さない
  const items = [
    ["総合GPA(最新)", gpa([...g.cumulative].reverse().find((r) => r.value !== null)?.value), true],
    ["通算GPA", gpa(g.byYear.find((r) => r.label === "通算")?.value), false],
    ["修得済単位", credit(total?.earned), false],
    ["履修中単位", credit(total?.inProgress ?? totals.inProgress), false],
  ] as const;
  return (
    <div className={`${box} grid grid-cols-4 max-[767px]:grid-cols-2`}>
      {items.map(([label, value, main], i) => (
        <div key={label} className={`px-4 py-3 ${i > 0 ? "min-[768px]:border-l min-[768px]:border-border" : ""} ${i % 2 === 1 ? "max-[767px]:border-l max-[767px]:border-border" : ""} ${i >= 2 ? "max-[767px]:border-t max-[767px]:border-border" : ""}`}>
          <p className="m-0 text-xs text-muted-foreground">{label}</p>
          <p className={`m-0 text-[24px] font-bold tabular-nums max-[767px]:text-[22px] ${main ? "text-primary" : ""}`}>{value}</p>
        </div>
      ))}
    </div>
  );
}

const Rows = ({ title, rows }: { title: string; rows: GpaRow[] }) => (
  <div>
    <p className="m-0 text-xs text-muted-foreground">{title}</p>
    <ul className="m-0 list-none p-0 text-sm">
      {rows.map((r, i) => (
        <li key={i} className="flex justify-between border-b border-border py-1 last:border-b-0">
          <span>{r.label}</span>
          <span className="tabular-nums">{gpa(r.value)}</span>
        </li>
      ))}
    </ul>
  </div>
);

function Fold({ title, children }: { title: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-border last:border-b-0">
      <button type="button" aria-expanded={open} onClick={() => setOpen(!open)} className="flex w-full cursor-pointer items-center justify-between border-0 bg-transparent px-4 py-2.5 text-left text-sm font-bold">
        {title}
        <span className="text-[12.5px] font-normal text-muted-foreground">{open ? "閉じる" : "開く"}</span>
      </button>
      {open && <div className="flex flex-col gap-3 px-4 pb-3">{children}</div>}
    </div>
  );
}

/** 下の折りたたみ 3 つ */
export function GradeFolds({ grades }: { grades: Grades }) {
  const { gpa: g, credits, totals } = grades;
  return (
    <section className={`${box} overflow-hidden`}>
      <Fold title="GPA推移表">
        <Rows title="年度ごとのGPA" rows={g.byYear.filter((r) => r.label !== "通算")} />
        <Rows title="年度学期ごとのGPA" rows={g.byTerm} />
      </Fold>
      <Fold title="単位修得状況">
        <CreditTable credits={credits} />
      </Fold>
      <Fold title="履修合計単位・合計単位(オンライン)">
        <p className="m-0 text-sm tabular-nums">{`履修合計単位 ${credit(totals.inProgress)} / 合計単位(オンライン) ${credit(totals.online)}`}</p>
      </Fold>
    </section>
  );
}
