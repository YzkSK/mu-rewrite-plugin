import type { SyllabusPage } from "@/muscat/api/types";
import { Card } from "@/ui/Card";
import { Chip } from "@/ui/Chip";
import { DataTable } from "@/ui/DataTable";
import { ListFoot, ListHead } from "../ListPager";

const HEADERS = ["曜日時限", "授業科目", "担当教員", "開講区分", "開講年度学期", "単位数"];

type Props = { page: SyllabusPage; busy: boolean; act: string | null; onClick: (ref: string, key?: string) => void; onSize: (ref: string, value: string) => void };

/** 検索後の一覧。科目名を押すと、元の画面のリンクを押す */
export function SyllabusResult({ page, busy, act, onClick, onSize }: Props) {
  const r = page.result;
  if (!r) return null;
  const term = page.term.options.find((o) => o.value === page.term.value)?.label ?? "";
  return (
    <Card className="gap-0 overflow-hidden p-0">
      <ListHead pager={r.pager} busy={busy} note={`開講 ${page.year.value}年度 ${term}`} onSize={onSize} />
      {r.empty ? (
        <div className="grid gap-1 px-2 py-7 text-center text-muted-foreground">
          <b className="text-[15px] text-foreground">該当する授業はありません</b>
          <span>条件をゆるめると見つかるかもしれません。</span>
        </div>
      ) : (
        <>
          <div className="px-3.5">
            <DataTable
              headers={HEADERS}
              stagger={`${r.pager.page}:${r.pager.total}`}
              rows={r.rows.map((row) => [
                row.time,
                <button key="t" type="button" disabled={busy} onClick={() => onClick(row.openRef)} className="cursor-pointer text-left font-bold text-primary underline underline-offset-[3px]">{row.title}</button>,
                row.teachers,
                <Chip key="k">{row.kind}</Chip>,
                <div key="y">{row.terms.map((t) => <div key={t}>{t}</div>)}</div>,
                row.credit,
              ])}
            />
          </div>
          <ListFoot pager={r.pager} busy={busy} loadingRef={act ?? undefined} onClick={onClick} />
        </>
      )}
    </Card>
  );
}
