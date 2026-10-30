import { IconChevronLeft } from "@tabler/icons-react";
import type { InfoItem } from "../api";
import { fileKind, fmtFull } from "../lib/lib";
import { sanitize } from "../lib/sanitize";

const BODY = "mt-4 border-t border-border pt-4 text-[13.5px] leading-[1.9] [overflow-wrap:anywhere] [&_a]:text-primary [&_a]:underline [&_img]:max-w-full [&_p]:my-1 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_table]:border-collapse max-[767px]:[&_table]:block max-[767px]:[&_table]:overflow-x-auto [&_td]:border [&_td]:border-border [&_td]:px-1";

type Props = { item: InfoItem | null; fail: boolean; onToggle: (it: InfoItem) => void; onBack: () => void };

/** 右の本文。上の帯に既読・未読の切り替え(狭い画面では「‹ 一覧へ」も) */
export function NoticeDetail({ item, fail, onToggle, onBack }: Props) {
  if (!item) return <p className="m-0 px-4 py-6 text-[13px] text-muted-foreground">お知らせを選んでください</p>;
  const sub = [item.category?.name, item.publish_from].filter(Boolean).join("、");
  const period = item.publish_start_at ? `${fmtFull(item.publish_start_at)} 〜${item.publish_end_at ? " " + fmtFull(item.publish_end_at) : ""}` : "";
  const event = item.event_title
    ? `【イベント】${item.event_title}${item.event_start_at ? "  " + fmtFull(item.event_start_at) + "〜" + (item.event_end_at ? fmtFull(item.event_end_at) : "") : ""}`
    : "";
  const files = [...(item.files ?? []), ...(item.personal_files ?? [])].filter((f) => f && f.uuid);
  return (
    <>
      <div className="flex items-center gap-2 border-b border-border px-4 py-2">
        <button type="button" onClick={onBack} className="flex h-11 cursor-pointer items-center gap-1 border-0 bg-transparent p-0 text-[13px] text-primary min-[768px]:hidden"><IconChevronLeft className="size-4" />一覧へ</button>
        <span className="flex-1" />
        {fail ? <span role="alert" className="text-[12.5px] text-error">失敗しました</span> : null}
        <button
          type="button"
          onClick={() => onToggle(item)}
          className="h-[30px] cursor-pointer rounded-[4px] border border-border bg-card px-3 text-[13px] hover:bg-muted max-[767px]:h-10"
        >
          {item.is_read === false ? "既読にする" : "未読に戻す"}
        </button>
      </div>
      <div className="max-w-[68ch] px-[22px] py-[18px] max-[767px]:px-3">
        {sub ? <p className="m-0 text-[12px] text-muted-foreground">{sub}</p> : null}
        <h2 className="mx-0 mt-1 mb-2 text-[19px] font-bold [overflow-wrap:anywhere]">{item.title}</h2>
        {period ? <p className="m-0 text-[12.5px] text-muted-foreground">{`公開期間 ${period}`}</p> : null}
        {event ? <p className="m-0 mt-1 text-[12.5px] text-muted-foreground">{event}</p> : null}
        <div className={BODY} dangerouslySetInnerHTML={{ __html: sanitize(item.content) }} />
        {files.length ? (
          <ul className="mx-0 mt-4 mb-0 flex list-none flex-col gap-2 p-0">
            {files.map((f) => (
              <li key={f.uuid}>
                <a
                  className="flex items-center gap-3 rounded-[4px] border border-border px-3 py-2 text-[13px] text-foreground no-underline hover:bg-muted"
                  href={"/api/file/view/" + encodeURIComponent(f.uuid!)}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <span className="min-w-0 flex-1 [overflow-wrap:anywhere]">{f.file_name || f.name}</span>
                  <span className="flex-none text-[11px] text-muted-foreground">{fileKind(f.mime_type)}</span>
                </a>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </>
  );
}
