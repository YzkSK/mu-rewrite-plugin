import type { ReactNode } from "react";

type Props = { title: string; titleClassName?: string; actions?: ReactNode; stickyHeader?: boolean; children: ReactNode };

/** 白地に 1px の枠。上に見出しの帯(題名と、右に操作)。stickyHeader で帯をスクロールしても上に残す */
export function Panel({ title, titleClassName = "text-sm font-semibold", actions, stickyHeader, children }: Props) {
  return (
    // overflow-hidden だと sticky が枠の中で止まるので、残すときは clip にする
    <section className={`${stickyHeader ? "overflow-clip" : "overflow-hidden"} rounded-[4px] border border-border bg-card text-card-foreground`}>
      <div className={`flex items-center justify-between gap-3 border-b border-border bg-muted px-4 py-2 ${stickyHeader ? "sticky top-0 z-10" : ""}`}>
        <h2 className={`m-0 ${titleClassName}`}>{title}</h2>
        {actions}
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
}
