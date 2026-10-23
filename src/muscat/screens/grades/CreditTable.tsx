import type { CreditRow } from "@/muscat/api/types";
import { Card } from "@/ui/Card";

const n = (v: number | null) => (v === null ? "-" : v.toFixed(1));

export function CreditTable({ credits }: { credits: CreditRow[] }) {
  if (credits.length === 0) return null;
  return (
    <Card className="p-4">
      <details>
        <summary className="cursor-pointer text-sm font-bold">単位の状況</summary>
        <table className="mt-2 w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-muted-foreground">
              <th>科目分類</th>
              <th>要件</th>
              <th>修得</th>
              <th>履修中</th>
              <th>合計</th>
            </tr>
          </thead>
          <tbody>
            {credits.map((r, i) => (
              <tr key={i} className="border-t border-border">
                <td style={{ paddingLeft: r.depth * 12 }}>{r.name}</td>
                <td>{n(r.required)}</td>
                <td>{n(r.earned)}</td>
                <td>{n(r.inProgress)}</td>
                <td>{n(r.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </Card>
  );
}
