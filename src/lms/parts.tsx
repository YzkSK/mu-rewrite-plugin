import type { ReactNode } from "react";

/** 白地に 1px の枠。上に見出しの帯(題名と、右に操作) */
export function Box({ title, actions, children }: { title: ReactNode; actions?: ReactNode; children: ReactNode }) {
  return (
    // 狭い画面は左右の枠を外して全幅の帯にする(親の左右余白 16px ぶん外へ出す)
    <section className="overflow-hidden rounded-[4px] border border-border bg-card text-card-foreground max-[767px]:-mx-4 max-[767px]:rounded-none max-[767px]:border-x-0">
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-2.5">
        <h2 className="m-0 text-sm font-semibold max-[767px]:font-bold">{title}</h2>
        <div className="flex items-center gap-2">{actions}</div>
      </div>
      {children}
    </section>
  );
}

export const Note = ({ children }: { children: ReactNode }) => <p className="m-0 px-4 py-4 text-[13px] text-muted-foreground">{children}</p>;
export const Row = ({ children }: { children: ReactNode }) => <li className="flex gap-3 border-b border-border px-4 py-2.5 max-[767px]:min-h-11 last:border-b-0">{children}</li>;
