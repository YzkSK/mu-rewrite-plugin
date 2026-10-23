import { useState } from "react";
import type { InfoPage } from "@/muscat/api/types";
import { Button } from "@/ui/Button";
import { CollapsibleCard } from "@/ui/CollapsibleCard";
import { InfoGrid } from "./InfoGrid";
import { InfoTableView } from "./InfoTableView";

export function InfoSections({ page }: { page: InfoPage }) {
  const [open, setOpen] = useState<boolean[]>(() => page.sections.map(() => true));
  const toggle = (i: number) => setOpen((o) => o.map((v, j) => (j === i ? !v : v)));
  const setAll = (v: boolean) => setOpen(page.sections.map(() => v));
  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-2">
        <Button variant="ghost" onClick={() => setAll(true)}>すべて開く</Button>
        <Button variant="ghost" onClick={() => setAll(false)}>すべて閉じる</Button>
      </div>
      {page.sections.map((s, i) => (
        <CollapsibleCard key={i} title={s.title} open={open[i] ?? true} onToggle={() => toggle(i)}>
          {s.grids.length === 0 && s.tables.length === 0 ? (
            <p className="text-sm text-muted-foreground">情報はありません</p>
          ) : (
            <div className="flex flex-col gap-3">
              {s.grids.map((g, j) => (
                <div key={`g${j}`} className={j > 0 ? "border-t border-border pt-3" : ""}>
                  <InfoGrid grid={g} />
                </div>
              ))}
              {s.tables.map((t, j) => (
                <InfoTableView key={`t${j}`} table={t} />
              ))}
            </div>
          )}
        </CollapsibleCard>
      ))}
    </div>
  );
}
