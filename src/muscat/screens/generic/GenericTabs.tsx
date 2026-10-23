import type { GBlock } from "@/muscat/api/types";
import type { Run } from "./GenericControl";

/** 横並びのタブの帯。押すと元のタブを click(切り替え) */
export function GenericTabs({ block, run }: { block: Extract<GBlock, { kind: "tabs" }>; run: Run }) {
  return (
    <div role="tablist" className="flex flex-wrap gap-x-1 border-b border-border">
      {block.tabs.map((t) => (
        <button
          key={t.ref}
          type="button"
          role="tab"
          aria-selected={t.selected}
          onClick={() => !t.selected && run([{ kind: "click", ref: t.ref }])}
          className={`cursor-pointer border-b-2 px-3 py-1.5 text-sm ${t.selected ? "border-primary font-bold" : "border-transparent text-muted-foreground"}`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
