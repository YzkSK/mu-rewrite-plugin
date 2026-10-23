import { useState } from "react";
import type { NewsGroup, NewsItem, NewsPage } from "@/muscat/api/types";
import { Card } from "@/ui/Card";
import { CollapsibleCard } from "@/ui/CollapsibleCard";
import { NewsRow } from "./NewsRow";

type Props = { page: NewsPage; busy: boolean; onClick: (ref: string) => void };

function Rows({ items, busy, onClick }: { items: NewsItem[]; busy: boolean; onClick: (ref: string) => void }) {
  return (
    <ul>
      {items.map((it, i) => (
        <NewsRow key={`${it.openRef}-${i}`} item={it} busy={busy} onClick={onClick} />
      ))}
    </ul>
  );
}

function GroupCard({ group, busy, onClick }: { group: NewsGroup; busy: boolean; onClick: (ref: string) => void }) {
  const [open, setOpen] = useState(true);
  return (
    <CollapsibleCard title={`${group.title}(${group.items.length})`} open={open} onToggle={() => setOpen(!open)}>
      <Rows items={group.items} busy={busy} onClick={onClick} />
    </CollapsibleCard>
  );
}

/** グループのタブなら分類ごとのカード、それ以外は 1 枚の平らな一覧 */
export function NewsList({ page, busy, onClick }: Props) {
  if (page.empty) return <Card className="p-4 text-sm">該当する掲示はありません</Card>;
  if (page.groups) return <>{page.groups.map((g, i) => <GroupCard key={`${g.title}-${i}`} group={g} busy={busy} onClick={onClick} />)}</>;
  return (
    <Card className="p-4">
      <Rows items={page.items} busy={busy} onClick={onClick} />
    </Card>
  );
}
