import { IconChevronDown, IconChevronUp, IconFlag, IconFlagFilled, IconX } from "@tabler/icons-react";
import type { ReactNode } from "react";
import type { NewsDetail } from "@/muscat/api/types";
import { Button } from "@/ui/Button";
import { Panel } from "@/ui/Panel";
import { sanitizeNewsHtml } from "./sanitize";

type Props = {
  detail: NewsDetail;
  busy: boolean;
  onClick: (ref: string, ajax: boolean) => void;
};

/** 開いている詳細。前後・フラグは ajax、閉じるは元のダイアログの閉じるボタン(通信なし) */
export function NewsDetailView({ detail, busy, onClick }: Props) {
  const iconBtn = (name: string, icon: ReactNode, off: boolean, fn: () => void, on = false) => (
    <button type="button" aria-label={name} aria-pressed={on || undefined} disabled={off} onClick={fn} className={`grid size-9 cursor-pointer place-items-center rounded-[4px] border-0 bg-transparent hover:bg-muted disabled:cursor-default disabled:opacity-40 ${on ? "text-primary" : "text-foreground"}`}>
      {icon}
    </button>
  );
  const actions = (
    <>
      <div className="flex flex-wrap items-center gap-1 max-[767px]:hidden">
        <Button variant="ghost" disabled={busy || !detail.prevRef} onClick={() => onClick(detail.prevRef, true)}>前の掲示</Button>
        <Button variant="ghost" disabled={busy || !detail.nextRef} onClick={() => onClick(detail.nextRef, true)}>次の掲示</Button>
        <Button variant={detail.flagged ? "primary" : "ghost"} disabled={busy || !detail.flagRef} onClick={() => onClick(detail.flagRef, true)}>
          {detail.flagged ? "フラグを外す" : "フラグ"}
        </Button>
        <Button variant="ghost" disabled={!detail.closeRef} onClick={() => onClick(detail.closeRef, false)}>
          <IconX size={16} aria-label="閉じる" />
        </Button>
      </div>
      {/* 狭い画面はアイコンだけ。閉じるは左上の戻るがあるので出さない */}
      <div className="flex items-center gap-0.5 min-[768px]:hidden">
        {iconBtn("前の掲示", <IconChevronUp size={20} />, busy || !detail.prevRef, () => onClick(detail.prevRef, true))}
        {iconBtn("次の掲示", <IconChevronDown size={20} />, busy || !detail.nextRef, () => onClick(detail.nextRef, true))}
        {iconBtn(detail.flagged ? "フラグを外す" : "フラグ", detail.flagged ? <IconFlagFilled size={20} /> : <IconFlag size={20} />, busy || !detail.flagRef, () => onClick(detail.flagRef, true), detail.flagged)}
      </div>
    </>
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
