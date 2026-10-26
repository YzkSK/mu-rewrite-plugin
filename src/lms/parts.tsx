import type { ReactNode } from "react";

/** 白地に 1px の枠。上に見出しの帯(題名と、右に操作) */
export function Box({ title, actions, children }: { title: ReactNode; actions?: ReactNode; children: ReactNode }) {
  return (
    <section className="overflow-hidden rounded-[4px] border border-border bg-card text-card-foreground">
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-2.5">
        <h2 className="m-0 text-sm font-semibold">{title}</h2>
        <div className="flex items-center gap-2">{actions}</div>
      </div>
      {children}
    </section>
  );
}

export const Note = ({ children }: { children: ReactNode }) => <p className="m-0 px-4 py-4 text-[13px] text-muted-foreground">{children}</p>;
export const Row = ({ children }: { children: ReactNode }) => <li className="flex gap-3 border-b border-border px-4 py-2.5 last:border-b-0">{children}</li>;
