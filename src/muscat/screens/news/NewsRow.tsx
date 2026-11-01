import { IconFlag, IconFlagFilled } from "@tabler/icons-react";
import type { NewsItem } from "@/muscat/api/types";
import { Chip } from "@/ui/Chip";

type Props = { item: NewsItem; busy: boolean; canSave: boolean; onOpen: () => void; onFlag: () => void; onRead: () => void };

/** 掲示 1 件。左に未読の点、件名(未読は太字)、差出人と日付、右に既読・未読の切り替えとフラグ */
export function NewsRow({ item, busy, canSave, onOpen, onFlag, onRead }: Props) {
  return (
    <li className="flex items-center gap-2 border-b border-border px-3 py-2 last:border-b-0 max-[767px]:min-h-11">
      <span aria-hidden="true" className={`size-2 shrink-0 rounded-full ${item.unread ? "bg-primary" : ""}`} />
      <button type="button" onClick={onOpen} className="flex min-w-0 flex-1 cursor-pointer flex-col gap-0.5 border-0 bg-transparent p-0 text-left">
        <span className="flex items-center gap-2">
          {item.important && <Chip tone="alert">重要</Chip>}
          <span className={`min-w-0 break-words text-sm ${item.unread ? "font-bold" : ""}`}>{item.title}</span>
        </span>
        <span className="text-xs text-muted-foreground">{[item.source, item.date.slice(5)].filter(Boolean).join(" ・ ")}</span>
      </button>
      <button
        type="button"
        disabled={busy || !item.readRef}
        onClick={onRead}
        // 狭い画面は隠す(行を開けば既読になる)
        className="shrink-0 cursor-pointer border-0 bg-transparent px-2 py-1 text-xs text-muted-foreground hover:text-primary disabled:cursor-default disabled:opacity-40 max-[767px]:hidden"
      >
        {item.unread ? "既読にする" : "未読にする"}
      </button>
      <button
        type="button"
        aria-label={item.flagged ? "フラグを外す" : "フラグをつける"}
        aria-pressed={item.flagged}
        disabled={busy || !canSave}
        onClick={onFlag}
        className={`grid shrink-0 cursor-pointer place-items-center border-0 bg-transparent px-2 py-1 disabled:cursor-default disabled:opacity-40 max-[767px]:size-9 max-[767px]:p-0 ${item.flagged ? "text-primary" : "text-muted-foreground"}`}
      >
        {item.flagged ? <IconFlagFilled size={18} /> : <IconFlag size={18} />}
      </button>
    </li>
  );
}
