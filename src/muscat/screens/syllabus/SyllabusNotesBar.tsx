import { useState } from "react";
import type { DriveStep } from "@/muscat/api/driver/drive";
import type { SyllabusPage } from "@/muscat/api/types";
import { Button } from "@/ui/Button";
import { Select } from "@/ui/Select";
import { TextInput } from "@/ui/TextInput";

type Props = { page: SyllabusPage; busy: boolean; act: string | null; onBack: () => void; onSearch: (steps: DriveStep[]) => void };

/** 「ふせんを貼った授業一覧」の上の段。年度・学期を変えて「検索」、または検索の画面へ戻る */
export function SyllabusNotesBar({ page, busy, act, onBack, onSearch }: Props) {
  const [year, setYear] = useState(page.year.value);
  const [term, setTerm] = useState(page.term.value);
  const search = () =>
    onSearch([
      ...(page.year.ref ? [{ kind: "set" as const, ref: page.year.ref, value: year }] : []),
      ...(page.term.ref ? [{ kind: "set" as const, ref: page.term.ref, value: term }] : []),
      { kind: "click", ref: page.searchRef, ajax: true },
    ]);
  return (
    <div className="flex flex-col gap-3 rounded-[4px] border border-border bg-card px-4 py-3.5">
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" disabled={busy || !page.backRef} onClick={onBack} className="cursor-pointer border-0 bg-transparent p-0 text-[13px] text-primary hover:underline disabled:cursor-default disabled:opacity-60">
          ‹ シラバス検索
        </button>
        <h2 className="m-0 text-[15px] font-bold">ふせんを貼った授業</h2>
      </div>
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-0.5 text-xs text-muted-foreground">
          開講年度学期
          <span className="flex items-center gap-1.5">
            <span className="w-20"><TextInput label="年度" value={year} disabled={busy} onChange={setYear} /></span>
            {page.term.options.length > 0 && <Select label="学期" value={term} options={page.term.options} disabled={busy} onChange={setTerm} />}
          </span>
        </label>
        <Button loading={busy && act === "search"} disabled={busy || !page.searchRef} onClick={search}>検索</Button>
      </div>
    </div>
  );
}
