import type { GBlock } from "@/muscat/api/types";
import { GenericCell } from "./GenericCell";
import type { Run } from "./GenericControl";

/** 項目名(薄く)と値の 2 列の格子。項目名の列は、いちばん長い項目名の幅(横いっぱいには広げない)。値は左寄せで、幅を抑える */
export function GenericFields({ block, run }: { block: Extract<GBlock, { kind: "fields" }>; run: Run }) {
  return (
    <dl className="grid grid-cols-[max-content_minmax(0,1fr)] items-center justify-start gap-x-4 gap-y-2 max-[767px]:grid-cols-1 max-[767px]:gap-y-1">
      {block.rows.map((r, i) => (
        <div key={i} className="contents">
          <dt className="text-xs text-muted-foreground max-[767px]:mt-2 max-[767px]:first:mt-0">{r.label}</dt>
          <dd className="max-w-xl">
            <GenericCell cell={r} run={run} />
          </dd>
        </div>
      ))}
    </dl>
  );
}
