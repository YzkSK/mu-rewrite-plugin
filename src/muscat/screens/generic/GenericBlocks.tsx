import type { GBlock } from "@/muscat/api/types";
import { DataTable } from "@/ui/DataTable";
import { GenericCell } from "./GenericCell";
import type { Run } from "./GenericControl";
import { GenericFields } from "./GenericFields";
import { GenericLine } from "./GenericLine";
import { GenericTabs } from "./GenericTabs";

/** 1 つのブロック。level 1〜2 の見出しは GenericSections がカードの題にするので、ここに来るのは 3〜4(小見出し) */
export function GenericBlock({ block, run }: { block: GBlock; run: Run }) {
  switch (block.kind) {
    case "heading":
      return <h3 className={`font-semibold ${block.level <= 3 ? "text-base" : "text-sm"}`}>{block.text}</h3>;
    case "line":
      return <GenericLine block={block} run={run} />;
    case "tabs":
      return <GenericTabs block={block} run={run} />;
    case "fields":
      return <GenericFields block={block} run={run} />;
    case "table":
      return <DataTable compact headers={block.headers} rows={block.rows.map((r) => r.map((c, j) => <GenericCell key={j} cell={c} run={run} />))} />;
    case "dialog":
      return null; // GenericSections が画面の上に重ねて出す
  }
}
