import type { ReactNode } from "react";

type Props = { title: string; actions?: ReactNode; children: ReactNode };

/** 白地に 1px の枠。上に見出しの帯(題名と、右に操作) */
export function Panel({ title, actions, children }: Props) {
  return (
    <section className="overflow-hidden rounded-[4px] border border-border bg-card text-card-foreground">
      <div className="flex items-center justify-between gap-3 border-b border-border bg-muted px-4 py-2">
        <h2 className="m-0 text-sm font-semibold">{title}</h2>
        {actions}
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
}
