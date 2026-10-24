import type { ReactNode } from "react";

/** 見出し + 行。セルの中身は任意の ReactNode */
export function DataTable({ headers, rows, compact, stagger }: { headers: string[]; rows: ReactNode[][]; compact?: boolean; stagger?: string }) {
  return (
    <div className="overflow-x-auto">
      <table className={`w-full ${compact ? "text-xs" : "text-sm"}`}>
        {headers.length > 0 && (
          <thead>
            <tr className="text-left text-xs text-muted-foreground">
              {headers.map((h, i) => (
                <th key={i}>{h}</th>
              ))}
            </tr>
          </thead>
        )}
        {/* stagger を指定すると、その値が変わるたび行が上から順に出る(ページ送り・検索のあと) */}
        <tbody key={stagger}>
          {rows.map((r, i) => (
            <tr key={i} className={`border-t border-border${stagger === undefined ? "" : " mu-row"}`} style={stagger === undefined ? undefined : ({ "--i": i } as React.CSSProperties)}>
              {r.map((c, j) => (
                <td key={j} className="py-1 pr-2 align-top">
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
