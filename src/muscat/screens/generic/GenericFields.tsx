import type { GBlock } from "@/muscat/api/types";
import { GenericCell } from "./GenericCell";
import type { Run } from "./GenericControl";

/** 項目名(薄く)と値の 2 列の格子 */
export function GenericFields({ block, run }: { block: Extract<GBlock, { kind: "fields" }>; run: Run }) {
  return (
    <dl className="grid grid-cols-[minmax(6rem,1fr)_2fr] items-center gap-x-3 gap-y-2">
      {block.rows.map((r, i) => (
        <div key={i} className="contents">
          <dt className="text-xs text-muted-foreground">{r.label}</dt>
          <dd>
            <GenericCell cell={r} run={run} />
          </dd>
        </div>
      ))}
    </dl>
  );
}
