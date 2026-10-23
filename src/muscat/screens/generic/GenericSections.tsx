import { useState } from "react";
import type { GBlock } from "@/muscat/api/types";
import { CollapsibleCard } from "@/ui/CollapsibleCard";
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

export function GenericSections({ blocks, run }: { blocks: GBlock[]; run: Run }) {
  const { head, sections } = split(blocks);
  return (
    <>
      {head.map((b, i) => (
        <GenericBlock key={i} block={b} run={run} />
      ))}
      {sections.map((s, i) => (
        <GenericSection key={i} section={s} run={run} />
      ))}
    </>
  );
}
