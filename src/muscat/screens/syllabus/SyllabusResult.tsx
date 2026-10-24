import type { SyllabusPage } from "@/muscat/api/types";
import { Card } from "@/ui/Card";
import { ListFoot, ListHead } from "../ListPager";

type Props = { page: SyllabusPage; busy: boolean; act: string | null; onClick: (ref: string, key?: string) => void; onSize: (ref: string, value: string) => void; onNote: () => void };

/** 帯の補足: 年度・学期と、選んだ曜日・時限 */
function summary(page: SyllabusPage) {
  const term = page.term.value ? (page.term.options.find((o) => o.value === page.term.value)?.label ?? "") : "";
  const on = (g: "days" | "periods") => page[g].filter((c) => c.checked).map((c) => c.label);
  const days = on("days");
  const periods = on("periods");
  return [`${page.year.value}年度 ${term}`.trim(), days.length ? `${days.join("・")}曜` : "", periods.join("・")].filter(Boolean).join("、");
}

/** 検索後の一覧。科目名を押すと、元の画面のリンクを押す */
export function SyllabusResult({ page, busy, act, onClick, onSize, onNote }: Props) {
  const r = page.result;
  if (!r) return null;
  const noteLink = (
    <button type="button" disabled={busy} onClick={onNote} className="cursor-pointer border-0 bg-transparent p-0 text-[12.5px] text-primary hover:underline disabled:cursor-default">
      ふせんを貼った授業の一覧
    </button>
  );
  return (
    <Card className="gap-0 overflow-hidden p-0">
      <ListHead pager={r.pager} busy={busy} note={summary(page)} actions={page.mode === "search" && noteLink} onSize={onSize} />
      {r.empty ? (
        <div className="grid gap-1 px-2 py-7 text-center text-muted-foreground">
          <b className="text-[15px] text-foreground">該当する授業はありません</b>
          <span>条件をゆるめると見つかるかもしれません。</span>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto px-3.5">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-muted-foreground">
                  <th className="w-20 py-1.5 font-normal">曜日時限</th>
                  <th className="py-1.5 font-normal">授業科目</th>
                  <th className="py-1.5 font-normal">担当教員</th>
                  <th className="py-1.5 font-normal">開講区分</th>
                  <th className="py-1.5 text-right font-normal">単位</th>
                </tr>
              </thead>
              <tbody key={`${r.pager.page}:${r.pager.total}`}>
                {r.rows.map((row, i) => (
                  <tr key={i} className="mu-row border-t border-border" style={{ "--i": i } as React.CSSProperties}>
                    <td className="py-2 pr-2 align-top">{row.time}</td>
                    <td className="py-2 pr-2 align-top">
                      <button type="button" disabled={busy} onClick={() => onClick(row.openRef)} className="cursor-pointer border-0 bg-transparent p-0 text-left font-bold text-primary hover:underline">{row.title}</button>
                      {row.code && <span className="ml-2 text-[11.5px] text-muted-foreground">{row.code}</span>}
                    </td>
                    <td className="py-2 pr-2 align-top">{row.teachers}</td>
                    <td className="py-2 pr-2 align-top text-muted-foreground">{row.kind}</td>
                    <td className="py-2 text-right align-top tabular-nums">{row.credit}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ListFoot pager={r.pager} busy={busy} loadingRef={act ?? undefined} onClick={onClick} />
        </>
      )}
    </Card>
  );
}
