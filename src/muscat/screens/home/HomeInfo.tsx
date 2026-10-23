type Props = { unread: number | null; disabled: boolean; onKeiji: () => void; onTimetable: () => void };

const tile = "flex min-w-24 cursor-pointer flex-col items-center gap-1 rounded-lg border border-border bg-card px-4 py-2 disabled:cursor-default disabled:opacity-60";

/** インフォメーション。押すと元のリンクを click する(画面は元のサイトが切り替える) */
export function HomeInfo({ unread, disabled, onKeiji, onTimetable }: Props) {
  return (
    <div className="flex gap-2">
      <button type="button" className={tile} disabled={disabled} onClick={onKeiji}>
        <b className="text-xl text-primary">{unread ?? "–"}</b>
        <span className="text-xs text-muted-foreground">未読の掲示</span>
      </button>
      <button type="button" className={tile} disabled={disabled} onClick={onTimetable}>
        <b className="text-xl">→</b>
        <span className="text-xs text-muted-foreground">時間割変更</span>
      </button>
    </div>
  );
}
