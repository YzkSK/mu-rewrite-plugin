import type { NewsItem } from "@/muscat/api/types";
import { Button } from "@/ui/Button";
import { Chip } from "@/ui/Chip";

type Props = { item: NewsItem; busy: boolean; onClick: (ref: string) => void };

/** 掲示 1 件。未読は件名を強調、重要・新着だけ色を付ける */
export function NewsRow({ item, busy, onClick }: Props) {
  return (
    <li className="flex flex-col gap-1 border-b border-border py-2 last:border-b-0">
      <div className="flex flex-wrap items-center gap-2">
        {item.important && <Chip tone="alert">重要</Chip>}
        {item.isNew && <Chip>新着</Chip>}
        <button
          type="button"
          onClick={() => onClick(item.openRef)}
          className={`cursor-pointer text-left text-sm underline-offset-2 hover:underline ${item.unread ? "font-bold" : ""}`}
        >
          {item.title}
        </button>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <span>{[item.category, item.source, item.date.slice(5)].filter(Boolean).join(" ・ ")}</span>
        <span className="flex gap-1">
          <Button variant="ghost" disabled={busy} onClick={() => onClick(item.flagRef)}>
            {item.flagged ? "フラグを外す" : "フラグ"}
          </Button>
          <Button variant="ghost" disabled={busy} onClick={() => onClick(item.readRef)}>
            {item.unread ? "既読にする" : "未読にする"}
          </Button>
        </span>
      </div>
    </li>
  );
}
