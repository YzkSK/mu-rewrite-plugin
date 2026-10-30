import type { ListResult, TeacherRow } from "@/muscat/api/types";
import { Card } from "@/ui/Card";
import { DataTable } from "@/ui/DataTable";
import { ListFoot, ListHead } from "../ListPager";

type Props = { list: ListResult<TeacherRow>; note?: string; busy: boolean; act: string | null; onClick: (ref: string) => void; onSize: (ref: string, value: string) => void };

/** 検索で見つかった教職員。氏名を押すと、その教員の予定(カレンダー)に変わる */
export function TeacherList({ list, note, busy, act, onClick, onSize }: Props) {
  return (
    <Card className="gap-0 overflow-hidden p-0">
      <ListHead pager={list.pager} busy={busy} note={note} onSize={onSize} />
      {list.empty ? (
        <div className="grid gap-1 px-2 py-7 text-center text-muted-foreground">
          <b className="text-[15px] text-foreground">該当する教職員はいません</b>
        </div>
      ) : (
        <>
          {/* 狭い画面は 3 列の表をやめ、2 行の一覧にする */}
          <ul key={`m${list.pager.page}:${list.pager.total}`} className="m-0 list-none p-0 min-[768px]:hidden">
            {list.rows.map((r, i) => (
              <li key={i} className="mu-row grid gap-0.5 border-t border-border px-3.5 py-2 first:border-t-0" style={{ "--i": i } as React.CSSProperties}>
                <button type="button" disabled={busy} onClick={() => onClick(r.openRef)} className="min-h-9 cursor-pointer text-left text-sm font-bold text-primary underline underline-offset-[3px]">
                  {r.name}
                  {r.kana && <span className="font-normal text-muted-foreground">{`(${r.kana})`}</span>}
                </button>
                <span className="text-xs text-muted-foreground">{[r.english, r.dept].filter(Boolean).join("、")}</span>
              </li>
            ))}
          </ul>
          <div className="px-3.5 max-[767px]:hidden">
            <DataTable
              headers={["氏名(カナ)", "英語氏名", "所属学科組織"]}
              stagger={`${list.pager.page}:${list.pager.total}`}
              rows={list.rows.map((r) => [
                <button key="n" type="button" disabled={busy} onClick={() => onClick(r.openRef)} className="cursor-pointer text-left font-bold text-primary underline underline-offset-[3px]">
                  {r.name}
                  {r.kana && <span className="font-normal text-muted-foreground">{`(${r.kana})`}</span>}
                </button>,
                r.english,
                r.dept,
              ])}
            />
          </div>
          <ListFoot pager={list.pager} busy={busy} loadingRef={act ?? undefined} onClick={onClick} />
        </>
      )}
    </Card>
  );
}
