import { useState } from "react";
import type { GradeFilter } from "@/muscat/api/types";
import { Button } from "@/ui/Button";
import { Card } from "@/ui/Card";
import { Checkbox } from "@/ui/Checkbox";

const LABELS: [keyof GradeFilter, string][] = [
  ["fail", "不合格科目"],
  ["inProgress", "履修中科目"],
  ["noCredit", "配当なし科目"],
  ["transfer", "振替科目"],
];

/** チェックを変えても通信しない。「表示」を押したときだけ onApply(成績照会は条件の自動反映をしない) */
export function GradeFilterBar({ value, busy, onApply }: { value: GradeFilter; busy: boolean; onApply: (f: GradeFilter) => void }) {
  const [draft, setDraft] = useState(value);
  return (
    <Card className="flex flex-wrap items-center gap-3 p-4">
      <span className="text-sm font-bold">表示する科目</span>
      {LABELS.map(([k, label]) => (
        <Checkbox key={k} label={label} checked={draft[k]} onChange={(c) => setDraft({ ...draft, [k]: c })} />
      ))}
      <Button disabled={busy} onClick={() => onApply(draft)}>表示</Button>
    </Card>
  );
}
