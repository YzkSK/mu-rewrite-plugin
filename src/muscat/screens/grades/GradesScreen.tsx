import { useState } from "react";
import type { MuscatClient } from "@/muscat/api/client";
import type { GradeFilter } from "@/muscat/api/types";
import { BusyOverlay } from "@/ui/BusyOverlay";
import { Button } from "@/ui/Button";
import { Checkbox } from "@/ui/Checkbox";
import { ErrorNotice } from "@/ui/ErrorNotice";
import { PageLoading } from "@/ui/PageLoading";
import { exportFile } from "../exportFile";
import { GradeList, type GradeCols, type GradeView } from "./GradeList";
import { GradeFolds, GradeStats } from "./GpaSummary";
import { useGrades, type GradesState } from "./useGrades";

type Props = {
  client: MuscatClient;
  initial?: GradesState;
  /** 以下はテスト用の初期値 */
  initialView?: GradeView;
  initialOpen?: boolean;
  initialCols?: GradeCols;
};

const SUBJECTS: [keyof GradeFilter, string][] = [
  ["fail", "不合格科目"],
  ["inProgress", "履修中科目"],
  ["noCredit", "配当なし科目"],
  ["transfer", "振替科目"],
];
const TABS: [GradeView, string][] = [
  ["category", "分類ごと"],
  ["term", "年度学期ごと"],
];

/** 表示する列は表の出し隠しだけ。科目のチェックは変えても通信せず、「表示」を押したときだけ onApply */
function Settings({ filter, busy, cols, onCols, onApply }: { filter: GradeFilter; busy: boolean; cols: GradeCols; onCols: (c: GradeCols) => void; onApply: (f: GradeFilter) => void }) {
  const [draft, setDraft] = useState(filter);
  return (
    <div className="grid grid-cols-[max-content_1fr_auto] items-center gap-x-4 gap-y-2 rounded-[4px] border border-border bg-card px-4 py-3">
      {/* 狭い画面のリストには GPA 対象の列が無いので、列の設定は出さない */}
      <span className="text-xs text-muted-foreground max-[767px]:hidden">表示する列</span>
      <div className="col-span-2 flex flex-wrap gap-4 max-[767px]:hidden">
        <Checkbox label="GPA対象" checked={cols.gpa} onChange={(gpa) => onCols({ ...cols, gpa })} />
        <Checkbox label="GPA対象(年度毎)" checked={cols.gpaYear} onChange={(gpaYear) => onCols({ ...cols, gpaYear })} />
      </div>
      <span className="text-xs text-muted-foreground">表示する科目</span>
      <div className="flex flex-wrap gap-4">
        {SUBJECTS.map(([k, label]) => (
          <Checkbox key={k} label={label} checked={draft[k]} onChange={(c) => setDraft({ ...draft, [k]: c })} />
        ))}
      </div>
      <Button loading={busy} onClick={() => onApply(draft)}>表示</Button>
    </div>
  );
}

export function GradesScreen({ client, initial, initialView = "category", initialOpen = false, initialCols = { gpa: true, gpaYear: true } }: Props) {
  const { status, grades, error, setFilter, retry } = useGrades(client, initial);
  const [view, setView] = useState<GradeView>(initialView);
  const [open, setOpen] = useState(initialOpen);
  const [cols, setCols] = useState(initialCols);
  const loading = status === "loading";
  return (
    <div className="flex flex-col gap-3 p-4">
      {grades && (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <div role="tablist" className="flex h-8 overflow-hidden rounded-[4px] border border-input max-[767px]:w-full">
              {TABS.map(([v, label]) => (
                <button
                  key={v}
                  type="button"
                  role="tab"
                  aria-selected={view === v}
                  onClick={() => setView(v)}
                  className={`cursor-pointer border-0 px-4 text-[13px] max-[767px]:flex-1 ${view === v ? "bg-primary font-bold text-white" : "bg-card"}`}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="ml-auto flex gap-2 max-[767px]:ml-0">
              <Button variant="secondary" onClick={() => setOpen(!open)}>
                <span className="max-[767px]:hidden">表示の設定</span>
                <span className="min-[768px]:hidden">設定</span>
                {open ? " ▴" : " ▾"}
              </Button>
              <Button variant="secondary" disabled={loading || !grades.exports.includes("PDF")} onClick={() => void exportFile(client, "成績照会", "PDF")}>PDF で出力</Button>
            </div>
          </div>
          {open && <Settings key={JSON.stringify(grades.filter)} filter={grades.filter} busy={loading} cols={cols} onCols={setCols} onApply={setFilter} />}
        </>
      )}
      {status === "error" && <ErrorNotice title="成績を読み込めませんでした" message={error ?? ""} onRetry={retry} />}
      {loading && !grades && <PageLoading />}
      {grades && ( // 読み直しに失敗しても、前の結果は残す
        <BusyOverlay busy={loading}>
          <div className="flex flex-col gap-3">
            <GradeStats grades={grades} />
            <GradeList entries={grades.entries} view={view} cols={cols} />
            <GradeFolds grades={grades} />
          </div>
        </BusyOverlay>
      )}
    </div>
  );
}
