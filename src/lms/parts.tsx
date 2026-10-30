import { IconChevronLeft, IconChevronRight } from "@tabler/icons-react";
import type { ReactNode } from "react";

/** 白地に 1px の枠。上に見出しの帯(題名と、右に操作) */
export function Box({ title, actions, children }: { title: ReactNode; actions?: ReactNode; children: ReactNode }) {
  return (
    // 狭い画面は左右の枠を外して全幅の帯にする(親の左右余白 16px ぶん外へ出す)
    <section className="overflow-hidden rounded-[4px] border border-border bg-card text-card-foreground max-[767px]:-mx-4 max-[767px]:rounded-none max-[767px]:border-x-0">
      <div className="relative flex items-center justify-between gap-3 border-b border-border px-4 py-2.5 max-[767px]:min-h-11">
        <h2 className="m-0 text-sm font-semibold max-[767px]:font-bold">{title}</h2>
        <div className="flex items-center gap-2">{actions}</div>
      </div>
      {children}
    </section>
  );
}

type NavLink = { name: string; url: string } | null;
const LINK = "flex-none whitespace-nowrap text-[12.5px] text-primary hover:underline max-[767px]:hidden";
const BTN = "flex h-11 flex-1 items-center justify-center gap-1 text-[13.5px] text-primary";

/** 前後の教材。広い画面は文字のリンク、狭い画面は画面下に固定の 2 等分ボタン(ページ側で下の余白 pb-20 を足す) */
export function NavLinks({ prev, next }: { prev?: NavLink; next?: NavLink }) {
  return (
    <>
      {prev ? <a className={LINK} href={prev.url} title={prev.name}>‹ 前の教材</a> : null}
      {next ? <a className={LINK} href={next.url} title={next.name}>次の教材 ›</a> : null}
      {prev || next ? (
        <nav aria-label="前後の教材" className="fixed inset-x-0 bottom-0 z-30 flex divide-x divide-border border-t border-border bg-card min-[768px]:hidden">
          {prev ? <a className={BTN} href={prev.url}><IconChevronLeft size={18} />前の教材</a> : <span className={`${BTN} opacity-40`}><IconChevronLeft size={18} />前の教材</span>}
          {next ? <a className={BTN} href={next.url}>次の教材<IconChevronRight size={18} /></a> : <span className={`${BTN} opacity-40`}>次の教材<IconChevronRight size={18} /></span>}
        </nav>
      ) : null}
    </>
  );
}

export const Note = ({ children }: { children: ReactNode }) => <p className="m-0 px-4 py-4 text-[13px] text-muted-foreground">{children}</p>;
export const Row = ({ children }: { children: ReactNode }) => <li className="flex gap-3 border-b border-border px-4 py-2.5 max-[767px]:min-h-11 last:border-b-0">{children}</li>;
