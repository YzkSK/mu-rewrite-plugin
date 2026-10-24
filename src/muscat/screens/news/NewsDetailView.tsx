import type { NewsDetail } from "@/muscat/api/types";
import { Button } from "@/ui/Button";
import { Panel } from "@/ui/Panel";
import { sanitizeNewsHtml } from "./sanitize";

type Props = {
  detail: NewsDetail;
  busy: boolean;
  onClick: (ref: string, ajax: boolean) => void;
  /** 「未読に戻す」。渡されなければ出さない(ホームでは使わない) */
  onUnread?: () => void;
};

/** 開いている詳細。前後・フラグは ajax、閉じるは元のダイアログの閉じるボタン(通信なし) */
export function NewsDetailView({ detail, busy, onClick, onUnread }: Props) {
  const actions = (
    <div className="flex flex-wrap items-center gap-1">
      <Button variant="ghost" disabled={busy || !detail.prevRef} onClick={() => onClick(detail.prevRef, true)}>前の掲示</Button>
      <Button variant="ghost" disabled={busy || !detail.nextRef} onClick={() => onClick(detail.nextRef, true)}>次の掲示</Button>
      {onUnread && <Button variant="ghost" disabled={busy} onClick={onUnread}>未読に戻す</Button>}
      <Button variant={detail.flagged ? "primary" : "ghost"} disabled={busy || !detail.flagRef} onClick={() => onClick(detail.flagRef, true)}>
        {detail.flagged ? "フラグを外す" : "フラグ"}
      </Button>
      <Button variant="ghost" disabled={!detail.closeRef} onClick={() => onClick(detail.closeRef, false)}>
        <span aria-label="閉じる">✕</span>
      </Button>
    </div>
  );
  return (
    <Panel title="掲示" actions={actions}>
      <div className="flex flex-col gap-3">
        <h2 className="m-0 text-base font-bold">{detail.title}</h2>
        <dl className="m-0 flex flex-col gap-2 text-sm">
          {/* 件名は見出しに出しているので、項目には並べない */}
          {detail.fields.filter((f) => f.label !== "件名").map((f, i) => (
            <div key={`${f.label}-${i}`}>
              <dt className="text-xs text-muted-foreground">{f.label}</dt>
              {f.label === "本文" ? (
                <dd className="m-0 break-words" dangerouslySetInnerHTML={{ __html: sanitizeNewsHtml(f.html) }} />
              ) : (
                <dd className="m-0 break-words">{f.text}</dd>
              )}
            </div>
          ))}
        </dl>
      </div>
    </Panel>
  );
}
