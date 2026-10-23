import type { GBlock, GCell } from "@/muscat/api/types";
import { DataTable } from "@/ui/DataTable";
import { Notice } from "@/ui/Notice";
import { GenericControl, type Run } from "./GenericControl";

function Cell({ cell, run }: { cell: Pick<GCell, "text" | "controls">; run: Run }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {cell.text && <span>{cell.text}</span>}
      {cell.controls.map((c) => (
        <GenericControl key={c.ref} control={c} run={run} bare />
      ))}
    </div>
  );
}

export function GenericBlock({ block, run }: { block: GBlock; run: Run }) {
  switch (block.kind) {
    case "heading":
      return <h2 className="mt-2 text-base font-semibold">{block.text}</h2>;
    case "message":
      return <Notice>{block.text}</Notice>;
    case "fields":
      return (
        <dl className="grid grid-cols-[minmax(6rem,1fr)_2fr] items-center gap-x-3 gap-y-2 text-sm">
          {block.rows.map((r, i) => (
            <div key={i} className="contents">
              <dt className="text-xs text-muted-foreground">{r.label}</dt>
              <dd>
                <Cell cell={r} run={run} />
              </dd>
            </div>
          ))}
        </dl>
      );
    case "table":
      return <DataTable headers={block.headers} rows={block.rows.map((r) => r.map((c, j) => <Cell key={j} cell={c} run={run} />))} />;
    case "controls":
      return (
        <div className="flex flex-wrap items-center gap-2">
          {block.controls.map((c) => (
            <GenericControl key={c.ref} control={c} run={run} />
          ))}
        </div>
      );
  }
}
