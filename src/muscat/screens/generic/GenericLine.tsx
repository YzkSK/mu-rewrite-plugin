import type { GBlock, GControl, GInline } from "@/muscat/api/types";
import { GenericControl, type Run } from "./GenericControl";

const isControl = (i: GInline): i is GControl => "ref" in i;
const WIDE = new Set(["text", "textarea"]);

/** 元の inline の並びのまま、文字と操作部品を 1 行に出す(幅が足りなければ折り返す) */
export function GenericLine({ block, run }: { block: Extract<GBlock, { kind: "line" }>; run: Run }) {
  const tone = block.tone === "notice" ? "rounded-md bg-muted px-3 py-2" : "";
  if (!block.items.some(isControl)) {
    return <p className={`text-sm ${tone}`}>{block.items.map((i) => (isControl(i) ? "" : i.text)).join(" ")}</p>;
  }
  return (
    <div className={`flex flex-wrap items-center gap-x-2 gap-y-1 ${tone}`}>
      {block.items.map((it, i) =>
        !isControl(it) ? (
          <span key={i} className="text-sm">
            {it.text}
          </span>
        ) : WIDE.has(it.kind) ? (
          <span key={it.ref} className="inline-block w-48 max-w-full">
            <GenericControl control={it} run={run} />
          </span>
        ) : (
          <GenericControl key={it.ref} control={it} run={run} />
        ),
      )}
    </div>
  );
}
