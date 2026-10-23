import type { InfoGrid as Grid } from "@/muscat/api/types";
import { InfoTableView } from "./InfoTableView";

export function InfoGrid({ grid }: { grid: Grid }) {
  if (grid.rows.some((r) => r.length !== 2)) {
    // 3 セル以上の行がある: 1 行目を見出しにした表
    const [headers = [], ...rows] = grid.rows;
    return <InfoTableView table={{ headers, rows }} />;
  }
  return (
    <dl className="grid grid-cols-[minmax(6rem,1fr)_2fr] gap-x-3 gap-y-1 text-sm">
      {grid.rows.map(([k, v], i) => (
        <div key={i} className="contents">
          <dt className="text-xs text-muted-foreground">{k}</dt>
          <dd>{v || "—"}</dd>
        </div>
      ))}
    </dl>
  );
}
