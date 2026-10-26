import type { GCell } from "@/muscat/api/types";
import { GenericControl, type Run } from "./GenericControl";

/** 表・fields のセル: 文字と操作部品を並べる */
export function GenericCell({ cell, run }: { cell: GCell; run: Run }) {
  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
      {cell.text && <span>{cell.text}</span>}
      {cell.controls.map((c) => (
        <GenericControl key={c.ref} control={c} run={run} />
      ))}
    </div>
  );
}
