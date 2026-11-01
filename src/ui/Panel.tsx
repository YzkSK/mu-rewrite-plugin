import type { ReactNode } from "react";

type Props = { title: string; titleClassName?: string; actions?: ReactNode; flush?: boolean; children: ReactNode };

/** 白地に 1px の枠。上に見出しの帯(題名と、右に操作)。狭い画面は左右の枠を外して全幅の帯にする(flush={false} は親に左右余白 16px が無い所用) */
export function Panel({ title, titleClassName = "text-sm font-semibold", actions, flush = true, children }: Props) {
  return (
    <section className={`overflow-hidden rounded-[4px] border border-border bg-card text-card-foreground ${flush ? "max-[767px]:-mx-4 max-[767px]:rounded-none max-[767px]:border-x-0" : ""}`}>
      <div className={`flex items-center justify-between gap-3 border-b border-border bg-muted px-4 py-2 ${flush ? "max-[767px]:bg-card" : ""}`}>
        <h2 className={`m-0 ${titleClassName} ${flush ? "max-[767px]:font-bold" : ""}`}>{title}</h2>
        {actions}
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
}
