import type { HomeNoticeTab } from "@/muscat/api/types";
import { Button } from "@/ui/Button";
import { Card } from "@/ui/Card";

type Props = { tabs: HomeNoticeTab[]; busy: boolean; onTab: (ref: string) => void; onOpen: (ref: string) => void };

/** お知らせ。タブの切り替えは元のタブを click(通信なし)。行は 日付(MM/DD)・件名・発信元 */
export function HomeNotices({ tabs, busy, onTab, onOpen }: Props) {
  const cur = tabs.find((t) => t.selected) ?? tabs[0];
  return (
    <Card className="flex flex-col gap-2 p-4">
      <h2 className="text-base font-bold">お知らせ</h2>
      <div className="flex gap-1">
        {tabs.map((t) => (
          <Button key={t.name} variant={t === cur ? "primary" : "ghost"} disabled={busy || !t.ref} onClick={() => onTab(t.ref)}>
            {t.name}
          </Button>
        ))}
      </div>
      {cur && cur.items.length === 0 && <p className="text-sm text-muted-foreground">お知らせはありません</p>}
      <ul>
        {cur?.items.map((n, i) => (
          <li key={`${n.openRef}-${i}`} className="flex flex-col gap-0.5 border-b border-border py-2 last:border-b-0">
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
    </Card>
  );
}
