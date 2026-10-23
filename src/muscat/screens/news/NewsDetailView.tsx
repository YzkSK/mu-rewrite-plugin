import type { NewsDetail } from "@/muscat/api/types";
import { Button } from "@/ui/Button";
import { Card } from "@/ui/Card";
import { sanitizeNewsHtml } from "./sanitize";

type Props = { detail: NewsDetail; busy: boolean; onClick: (ref: string, ajax: boolean) => void };

/** 開いている詳細。前後・フラグは ajax、閉じるは元のダイアログの閉じるボタン(通信なし) */
export function NewsDetailView({ detail, busy, onClick }: Props) {
  return (
    <Card className="flex flex-col gap-3 p-4">
      <h2 className="text-base font-bold">{detail.title}</h2>
      <dl className="flex flex-col gap-2 text-sm">
        {detail.fields.map((f, i) => (
          <div key={`${f.label}-${i}`}>
            <dt className="text-xs text-muted-foreground">{f.label}</dt>
            {f.label === "本文" ? (
              <dd className="break-words" dangerouslySetInnerHTML={{ __html: sanitizeNewsHtml(f.html) }} />
            ) : (
              <dd className="break-words">{f.text}</dd>
            )}
          </div>
        ))}
      </dl>
      <div className="flex flex-wrap gap-2">
        <Button variant="ghost" disabled={busy || !detail.prevRef} onClick={() => onClick(detail.prevRef, true)}>前へ</Button>
        <Button variant="ghost" disabled={busy || !detail.nextRef} onClick={() => onClick(detail.nextRef, true)}>次へ</Button>
        <Button variant="ghost" disabled={busy || !detail.flagRef} onClick={() => onClick(detail.flagRef, true)}>
          {detail.flagged ? "フラグを外す" : "フラグ"}
        </Button>
        <Button disabled={!detail.closeRef} onClick={() => onClick(detail.closeRef, false)}>閉じる</Button>
      </div>
    </Card>
  );
}
