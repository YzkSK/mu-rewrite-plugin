import type { HomeNotice } from "@/muscat/api/types";
import { Panel } from "@/ui/Panel";

type Props = { title: string; items: HomeNotice[]; busy: boolean; onOpen: (ref: string) => void; badge?: number | null; onBadge?: () => void; badgeDisabled?: boolean };

/** お知らせ 1 区分。行は 日付(MM/DD)・件名・発信元。badge は題名の右の紫の札(押すと掲示の一覧へ) */
export function NoticePanel({ title, items, busy, onOpen, badge, onBadge, badgeDisabled }: Props) {
  const actions =
    onBadge && (
      <button
        type="button"
        disabled={busy || badgeDisabled}
        onClick={onBadge}
        className="flex cursor-pointer items-center gap-1.5 text-xs text-primary disabled:cursor-default disabled:opacity-60"
      >
        未読の掲示
        <b className="rounded-[4px] bg-primary px-1.5 text-xs text-primary-foreground">{badge ?? "–"}</b>
      </button>
    );
  return (
    <Panel title={title} actions={actions}>
      {items.length === 0 && <p className="m-0 text-sm text-muted-foreground">お知らせはありません</p>}
      <ul className="m-0 list-none p-0">
        {items.map((n, i) => (
          <li key={`${n.openRef}-${i}`} className="flex flex-col gap-0.5 border-b border-border py-2 first:pt-0 last:border-b-0 last:pb-0">
            <div className="flex gap-2 text-sm">
              <span className="shrink-0 text-xs leading-5 text-muted-foreground">{n.date.slice(5)}</span>
              <button type="button" disabled={busy || !n.openRef} onClick={() => onOpen(n.openRef)} className="cursor-pointer text-left underline-offset-2 hover:underline">
                {n.title}
              </button>
            </div>
            {n.source && <span className="pl-10 text-xs text-muted-foreground">{n.source}</span>}
          </li>
        ))}
      </ul>
    </Panel>
  );
}
