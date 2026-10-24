import { useState } from "react";
import type { GBlock } from "@/muscat/api/types";
import { CollapsibleCard } from "@/ui/CollapsibleCard";
import { Panel } from "@/ui/Panel";
import { GenericBlock } from "./GenericBlocks";
import type { Run } from "./GenericControl";

type Section = { title: string; body: GBlock[] };

/** level 1〜2 の見出しごとに区切る。最初の見出しより前は head(カードに入れない) */
function split(blocks: GBlock[]) {
  const head: GBlock[] = [];
  const sections: Section[] = [];
  for (const b of blocks) {
    if (b.kind === "heading" && b.level <= 2) sections.push({ title: b.text, body: [] });
    else (sections[sections.length - 1]?.body ?? head).push(b);
  }
  return { head, sections };
}

function GenericSection({ section, run }: { section: Section; run: Run }) {
  const [open, setOpen] = useState(true);
  return (
    <CollapsibleCard title={section.title} open={open} onToggle={() => setOpen(!open)}>
      <div className="flex flex-col gap-2">
        {section.body.map((b, i) => (
          <GenericBlock key={i} block={b} run={run} />
        ))}
      </div>
    </CollapsibleCard>
  );
}

/** 開いているダイアログ。閉じる操作は元の OK・キャンセルが担う(押すと元が閉じ、読み直しで消える) */
function GenericDialog({ title, blocks, run }: { title: string; blocks: GBlock[]; run: Run }) {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center overflow-auto bg-[rgb(34_27_43/.35)] p-4">
      <div role="dialog" aria-modal="true" aria-label={title} className="max-h-full w-full max-w-lg overflow-auto">
        <Panel title={title}>
          <div className="flex flex-col gap-2">
            {blocks.map((b, i) => (
              <GenericBlock key={i} block={b} run={run} />
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}

export function GenericSections({ blocks, run }: { blocks: GBlock[]; run: Run }) {
  const dialogs = blocks.filter((b) => b.kind === "dialog");
  const { head, sections } = split(blocks.filter((b) => b.kind !== "dialog"));
  return (
    <>
      {head.map((b, i) => (
        <GenericBlock key={i} block={b} run={run} />
      ))}
      {sections.map((s, i) => (
        <GenericSection key={i} section={s} run={run} />
      ))}
      {dialogs.map((d, i) => (
        <GenericDialog key={i} title={d.title} blocks={d.blocks} run={run} />
      ))}
    </>
  );
}
