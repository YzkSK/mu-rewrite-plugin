import { IconChevronDown } from "@tabler/icons-react";
import { useState } from "react";
import type { InfoGrid as Grid, InfoPage, InfoSection, InfoTable } from "@/muscat/api/types";
import { InfoGrid } from "../info/InfoGrid";

const Card = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="rounded-[4px] border border-border bg-card">
    <h2 className="m-0 border-b border-border bg-muted px-3.5 py-2 text-sm font-semibold">{title}</h2>
    <div className="p-3.5">{children}</div>
  </section>
);

/** 年度ごとの表。中身が全部空の列は出さず、一番新しい年度(左端の値の列)を強調する */
export function YearTable({ table }: { table: InfoTable }) {
  const keep = table.headers.map((h, j) => j === 0 || !!h || table.rows.some((r) => r[j]));
  const cols = keep.flatMap((k, j) => (k ? [j] : []));
  const cell = "border border-[#ECE9EF] px-2.5 py-1.5";
  // 狭い画面は横にスクロールしても項目の列を左に残す(背景は不透明)
  const pin = "max-[767px]:sticky max-[767px]:left-0 max-[767px]:z-[1]";
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-[13px] tabular-nums">
        <thead>
          <tr className="text-[12.5px]">
            {cols.map((j, n) => (
              <th key={j} className={`${cell} font-semibold ${n === 0 ? `${pin} bg-[#FAF9FB] text-left text-muted-foreground` : n === 1 ? "border-primary bg-primary text-primary-foreground" : "bg-[#FAF9FB]"}`}>
                {table.headers[j]}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {table.rows.map((r, i) => (
            <tr key={i}>
              {cols.map((j, n) => (
                <td key={j} className={`${cell} ${n === 0 ? `${pin} bg-[#FAF9FB] text-[12.5px] text-muted-foreground` : `text-center ${n === 1 ? "bg-[#F7F4FA] font-semibold" : ""}`} ${r[j] ? "" : "text-[#B8B2BF]"}`}>
                  {r[j] || "—"}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** 項目と値の組を 2 組ずつ横に並べる(狭い画面は 1 組) */
function PairGrid({ grid }: { grid: Grid }) {
  return (
    <dl className="m-0 grid grid-cols-[160px_minmax(0,1fr)_160px_minmax(0,1fr)] border border-b-0 border-[#ECE9EF] text-[13px] max-md:grid-cols-[140px_minmax(0,1fr)]">
      {grid.rows.map(([k, v], i) => (
        <div key={i} className="contents">
          <dt className="border-b border-[#ECE9EF] bg-[#FAF9FB] px-2.5 py-1.5 text-[12.5px] text-muted-foreground">{k}</dt>
          <dd className={`m-0 border-b border-[#ECE9EF] px-2.5 py-1.5 ${v ? "" : "text-[#B8B2BF]"}`}>{v || "—"}</dd>
        </div>
      ))}
    </dl>
  );
}

/** 小さな節を 1 枚のカードに行として並べ、押すと開く */
function Folds({ sections }: { sections: InfoSection[] }) {
  const [open, setOpen] = useState<number | null>(null);
  return (
    <div className="overflow-hidden rounded-[4px] border border-border bg-card">
      {sections.map((s, i) => (
        <div key={i} className={i > 0 ? "border-t border-[#ECE9EF]" : ""}>
          <button
            type="button"
            aria-expanded={open === i}
            onClick={() => setOpen(open === i ? null : i)}
            className="flex w-full cursor-pointer items-center justify-between border-0 bg-transparent px-3.5 py-2.5 text-left hover:bg-muted"
          >
            <b className="text-[13.5px]">{s.title}</b>
            <IconChevronDown className={`size-4 text-muted-foreground transition-transform duration-200 ${open === i ? "rotate-180" : ""}`} />
          </button>
          {open === i && (
            <div className="flex flex-col gap-3 px-3.5 pb-3.5">
              {s.grids.map((g, j) => <InfoGrid key={j} grid={g} />)}
              {s.tables.map((t, j) => <YearTable key={j} table={t} />)}
              {s.grids.length === 0 && s.tables.length === 0 && <p className="m-0 text-[13px] text-muted-foreground">情報はありません</p>}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

/** 健康診断情報照会。年度の表と抗体価をカードで、残りの小さな節はたたんで出す */
export function HealthView({ page }: { page: InfoPage }) {
  // 年度の表は 3 セル以上の行の並び(1 行目が「実施年度 | 2026 | …」)で届く(実機で確認)ので表に直す
  const sections = page.sections.map((s) => {
    const wide = s.grids.filter((g) => g.rows.some((r) => r.length > 2));
    return { ...s, grids: s.grids.filter((g) => !wide.includes(g)), tables: [...wide.map(({ rows: [headers = [], ...rows] }) => ({ headers, rows })), ...s.tables] };
  });
  const main = sections.filter((s) => s.tables.length > 0);
  // 項目の数は年で変わるので、見出しで見分ける
  const antibody = sections.filter((s) => !s.tables.length && s.title.includes("抗体価"));
  const rest = sections.filter((s) => !main.includes(s) && !antibody.includes(s));
  return (
    <div className="flex max-w-[980px] flex-col gap-3.5">
      {main.map((s, i) => (
        <Card key={`m${i}`} title={s.title}>
          <div className="flex flex-col gap-3">
            {s.tables.map((t, j) => <YearTable key={j} table={t} />)}
            {s.grids.map((g, j) => <InfoGrid key={j} grid={g} />)}
          </div>
        </Card>
      ))}
      {antibody.map((s, i) => (
        <Card key={`a${i}`} title={s.title}>
          <div className="flex flex-col gap-3">{s.grids.map((g, j) => <PairGrid key={j} grid={g} />)}</div>
        </Card>
      ))}
      {rest.length > 0 && <Folds sections={rest} />}
    </div>
  );
}
