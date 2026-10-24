import type { ReactNode } from "react";
import type { ListPager as Pager } from "@/muscat/api/types";
import { Button } from "@/ui/Button";
import { Select } from "@/ui/Select";

type Props = {
  pager: Pager;
  busy: boolean;
  /** 件数のあとに出す補足(「開講 2026年度 3学期」など) */
  note?: string;
  onClick: (ref: string) => void;
  onSize: (ref: string, value: string) => void;
};

/** 一覧の上の「N 件 / 1 ページの件数」の段と、下のページ送り。元の画面のページャーのリンクを押す */
export function ListHead({ pager, busy, note, actions, onSize }: Omit<Props, "onClick"> & { actions?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-x-3.5 gap-y-2 border-b border-border px-3.5 py-2.5">
      <b key={pager.total} className="mu-fade text-[15px]">{`${pager.total} 件`}</b>
      {note && <span className="text-[13px] text-muted-foreground">{note}</span>}
      <span className="flex-1" />
      {actions}
      {pager.size && (
        <>
          <span className="text-[13px] text-muted-foreground">1 ページ</span>
          <Select label="1 ページの件数" value={pager.size.value} options={pager.size.options} disabled={busy} onChange={(v) => onSize(pager.size!.ref, v)} />
          <span className="text-[13px] text-muted-foreground">件</span>
        </>
      )}
    </div>
  );
}

export function ListFoot({ pager, busy, loadingRef, onClick }: Pick<Props, "pager" | "busy" | "onClick"> & { loadingRef?: string }) {
  if (pager.pages <= 1) return null;
  const btn = (label: string, ref: string, key: string) => (
    <Button key={key} variant="ghost" disabled={busy || !ref} loading={!!ref && loadingRef === ref} onClick={() => onClick(ref)}>{label}</Button>
  );
  return (
    <nav aria-label="ページ送り" className="flex flex-wrap items-center justify-center gap-1 p-2.5">
      {btn("‹ 前", pager.prevRef, "prev")}
      {pager.pageLinks.map((l) => (
        <Button key={l.n} variant={l.current ? "primary" : "ghost"} disabled={busy || l.current} loading={loadingRef === l.ref} onClick={() => onClick(l.ref)}>{String(l.n)}</Button>
      ))}
      {btn("次 ›", pager.nextRef, "next")}
      <span className="text-[13px] text-muted-foreground">{`${pager.page} / ${pager.pages} ページ`}</span>
    </nav>
  );
}
