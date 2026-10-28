import { BusyOverlay } from "@/ui/BusyOverlay";
import { Button } from "@/ui/Button";
import { Select } from "@/ui/Select";
import { Spin } from "@/ui/Spin";
import { TextInput } from "@/ui/TextInput";
import type { InfoItem } from "../api";
import { fmtWhen, type FlatCategory } from "../lib/lib";

export type Filter = "all" | "unread" | "pinned";
const FILTERS: [Filter, string][] = [["all", "すべて"], ["unread", "未読"], ["pinned", "ピン留め"]];
const LINK = "cursor-pointer border-0 bg-transparent p-0 text-[12.5px] text-primary hover:underline";

type ToolbarProps = {
  draft: string; onDraft: (v: string) => void; onCommit: () => void;
  cats: FlatCategory[]; category: string; onCategory: (v: string) => void;
  filter: Filter; onFilter: (f: Filter) => void; unread: number | null; count: number | null;
  onAll: () => void;
};

/** すべて既読の対象。検索・未読のみは対象外(元のポータルと同じ) */
export const allScope = (category: string, filter: Filter): string => (category ? "このカテゴリ" : filter === "pinned" ? "ピン留め" : "全カテゴリ");

export function NoticesToolbar(p: ToolbarProps) {
  const options = [
    { value: "", label: "すべてのカテゴリ" },
    ...p.cats.map((c) => ({ value: c.uuid, label: "　".repeat(c.depth) + c.name + (typeof c.unread_count === "number" && c.unread_count > 0 ? `(${c.unread_count})` : "") })),
  ];
  return (
    <div className="flex flex-col gap-2.5 border-b border-border px-4 py-3">
      <div className="flex flex-wrap gap-2">
        <div className="min-w-[160px] flex-[2]"><TextInput label="お知らせを探す" placeholder="タイトル・本文で探す" value={p.draft} onChange={p.onDraft} onCommit={p.onCommit} /></div>
        <div className="min-w-[140px] flex-1"><Select label="カテゴリ" value={p.category} options={options} onChange={p.onCategory} /></div>
      </div>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <div role="tablist" aria-label="絞り込み" className="flex">
          {FILTERS.map(([f, label], i) => (
            <button
              key={f}
              type="button"
              role="tab"
              aria-selected={p.filter === f}
              onClick={() => p.onFilter(f)}
              className={`h-8 cursor-pointer border px-3 text-[13px] ${i ? "-ml-px" : "rounded-l-[4px]"} ${i === FILTERS.length - 1 ? "rounded-r-[4px]" : ""} ${p.filter === f ? "relative border-primary bg-primary text-primary-foreground" : "border-border bg-card hover:bg-muted"}`}
            >
              {f === "unread" && p.unread ? `${label} ${p.unread}` : label}
            </button>
          ))}
        </div>
        {p.count != null ? <span className="text-[12.5px] text-muted-foreground">{`${p.count} 件`}</span> : null}
        <span className="flex-1" />
        <button type="button" className={LINK} onClick={p.onAll}>すべて既読にする</button>
      </div>
    </div>
  );
}

type ListProps = {
  rows: InfoItem[]; status: "loading" | "ok" | "error"; sel: string | null; more: boolean;
  onPick: (uuid: string) => void; onMore: () => void; onRetry: () => void;
};

export function NoticesRows({ rows, status, sel, more, onPick, onMore, onRetry }: ListProps) {
  if (status === "error") {
    return (
      <div className="flex flex-col items-start gap-2 px-4 py-4">
        <p role="alert" className="m-0 text-[13px] text-error">読み込めませんでした</p>
        <Button variant="secondary" onClick={onRetry}>もう一度読み込む</Button>
      </div>
    );
  }
  if (!rows.length) {
    return status === "loading"
      ? <div className="grid place-items-center py-16"><Spin className="size-8" /></div>
      : <p className="m-0 px-4 py-6 text-[13px] text-muted-foreground">該当するお知らせはありません</p>;
  }
  const now = new Date();
  return (
    <BusyOverlay busy={status === "loading"}>
      <ul className="m-0 list-none p-0">
        {rows.map((it) => {
          const unread = it.is_read === false;
          return (
            <li key={it.uuid} className="border-b border-border">
              <button
                type="button"
                aria-current={it.uuid === sel ? "true" : undefined}
                onClick={() => onPick(it.uuid)}
                className={`grid w-full cursor-pointer grid-cols-[8px_1fr_auto] items-center gap-2.5 border-0 px-4 py-3 text-left text-inherit transition-colors ${it.uuid === sel ? "bg-sidebar-accent shadow-[inset_3px_0_0_var(--mu-primary)]" : "bg-transparent hover:bg-muted"}`}
              >
                <span aria-hidden="true" className={`size-2 rounded-full ${unread ? "bg-primary" : ""}`} />
                <span className="min-w-0">
                  <span className={`block text-[13.5px] [overflow-wrap:anywhere] ${unread ? "font-semibold" : "text-foreground/80"}`}>{it.title}</span>
                  <span className="block text-[12px] text-muted-foreground">{[it.category?.name, it.publish_from].filter(Boolean).join("、")}</span>
                </span>
                <span className="text-[12px] text-muted-foreground">{it.publish_start_at ? fmtWhen(it.publish_start_at, now) : ""}</span>
              </button>
            </li>
          );
        })}
      </ul>
      {more ? <button type="button" onClick={onMore} className="w-full cursor-pointer border-0 bg-transparent px-4 py-3 text-[13px] text-primary hover:bg-muted">さらに表示</button> : null}
    </BusyOverlay>
  );
}
