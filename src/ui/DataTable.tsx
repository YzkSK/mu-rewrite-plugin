import type { ReactNode } from "react";

/** 見出し + 行。セルの中身は任意の ReactNode */
export function DataTable({ headers, rows, compact }: { headers: string[]; rows: ReactNode[][]; compact?: boolean }) {
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
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-t border-border">
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
