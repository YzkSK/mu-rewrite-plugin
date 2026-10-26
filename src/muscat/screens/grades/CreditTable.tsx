import type { CreditRow } from "@/muscat/api/types";

const n = (v: number | null) => (v === null ? "-" : v.toFixed(1));

export function CreditTable({ credits }: { credits: CreditRow[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[420px] border-collapse text-[13px]">
        <thead>
          <tr className="text-left text-xs text-muted-foreground">
            <th className="py-1 font-normal">科目分類</th>
            <th className="py-1 text-right font-normal">要件</th>
            <th className="py-1 text-right font-normal">修得</th>
            <th className="py-1 text-right font-normal">履修中</th>
            <th className="py-1 text-right font-normal">合計</th>
          </tr>
        </thead>
        <tbody>
          {credits.map((r, i) => (
            <tr key={i} className="border-t border-border tabular-nums">
              <td className="py-1" style={{ paddingLeft: r.depth * 12 }}>{r.name}</td>
              <td className="text-right">{n(r.required)}</td>
              <td className="text-right">{n(r.earned)}</td>
              <td className="text-right">{n(r.inProgress)}</td>
              <td className="text-right">{n(r.total)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
