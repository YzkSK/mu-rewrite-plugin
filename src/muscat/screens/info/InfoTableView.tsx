import type { InfoTable } from "@/muscat/api/types";

/** 見出し行のある表。項目の表と同じ罫線、横に長ければ枠の中で横に流す */
export function InfoTableView({ table }: { table: InfoTable }) {
  const cell = "border border-[#ECE9EF] px-2.5 py-1.5";
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-[13px] tabular-nums">
        <thead>
          <tr className="text-left text-[12.5px]">
            {table.headers.map((h, i) => (
              <th key={i} className={`${cell} bg-[#FAF9FB] font-semibold text-muted-foreground`}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {table.rows.map((r, i) => (
            <tr key={i}>
              {r.map((c, j) => (
                <td key={j} className={`${cell} ${c ? "" : "text-[#B8B2BF]"}`}>{c || "—"}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
