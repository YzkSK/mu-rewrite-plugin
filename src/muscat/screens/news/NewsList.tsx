import type { NewsGroup, NewsItem, NewsPage } from "@/muscat/api/types";
import { Button } from "@/ui/Button";
import { EmptyState } from "@/ui/EmptyState";
import { canMarkAllRead } from "./newsSteps";
import { NewsRow } from "./NewsRow";

type Props = {
  page: NewsPage;
  busy: boolean;
  onOpen: (ref: string) => void;
  onFlag: (item: NewsItem) => void;
  onRead: (item: NewsItem) => void;
  onMarkAllRead: (group: NewsGroup) => void;
  onMore: (ref: string) => void;
};

/** グループのタブなら分類ごとの帯つきの枠、それ以外は 1 枚の平らな一覧 */
export function NewsList({ page, busy, onOpen, onFlag, onRead, onMarkAllRead, onMore }: Props) {
  if (page.empty) return <EmptyState title="該当する掲示はありません" />;
  const rows = (items: NewsItem[]) => (
    <ul className="m-0 list-none p-0">
      {items.map((it, i) => (
        <NewsRow key={`${it.openRef}-${i}`} item={it} busy={busy} canSave={!!it.flagRef} onOpen={() => onOpen(it.openRef)} onFlag={() => onFlag(it)} onRead={() => onRead(it)} />
      ))}
    </ul>
  );
  if (!page.groups) {
    return (
      <section className="overflow-hidden rounded-[4px] border border-border bg-card">{rows(page.items)}</section>
    );
  }
  return (
    <div className="flex flex-col gap-3">
      {page.groups.map((g, i) => (
        <section key={`${g.title}-${i}`} className="overflow-hidden rounded-[4px] border border-border bg-card">
          <div className="flex items-center justify-between gap-3 border-b border-border bg-muted px-3 py-2">
            <div className="flex min-w-0 flex-wrap items-baseline gap-x-2">
              <h2 className="m-0 text-sm font-semibold">{g.title}</h2>
              {g.description && <small className="text-xs text-muted-foreground">{g.description}</small>}
              {g.items.some((it) => it.unread) && <small className="text-xs font-semibold text-primary">{`未読 ${g.items.filter((it) => it.unread).length}`}</small>}
            </div>
            <Button variant="secondary" disabled={busy || !g.items.some((it) => it.unread) || !canMarkAllRead(page, g)} onClick={() => onMarkAllRead(g)}>すべて既読にする</Button>
          </div>
          {rows(g.items)}
          {g.moreRef && (
            <div className="border-t border-border px-3 py-2">
              <Button variant="ghost" disabled={busy} onClick={() => onMore(g.moreRef)}>すべて表示する</Button>
            </div>
          )}
        </section>
      ))}
    </div>
  );
}
