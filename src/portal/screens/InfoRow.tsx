import { useId, useState } from "react";
import type { InfoItem } from "../api";
import { fmtWhen } from "../lib/lib";
import { sanitize } from "../lib/sanitize";

const BODY = "text-[13px] leading-relaxed [&_a]:text-primary [&_a]:underline [&_img]:max-w-full [&_p]:my-1 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_table]:border-collapse max-[767px]:[&_table]:block max-[767px]:[&_table]:overflow-x-auto [&_td]:border [&_td]:border-border [&_td]:px-1";

/** お知らせ 1 件。押すと本文と添付が下に開く */
export function InfoRow({ it, sub, unreadDot, now }: { it: InfoItem; sub: string; unreadDot: boolean; now: Date }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const unread = unreadDot && it.is_read === false;
  const files = [...(it.files ?? []), ...(it.personal_files ?? [])].filter((f) => f && (f.uuid || f.file_name));
  return (
    <li className="border-b border-border last:border-b-0">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen(!open)}
        className="flex w-full cursor-pointer items-start gap-2 border-0 bg-transparent px-4 py-2.5 text-left text-inherit hover:bg-muted max-[767px]:min-h-11"
      >
        {unreadDot ? <span aria-hidden="true" className={`mt-[7px] size-2 flex-none rounded-full ${unread ? "bg-primary" : ""}`} /> : null}
        <span className="min-w-0 flex-1">
          <span className={`block text-[13.5px] [overflow-wrap:anywhere] ${unread ? "font-semibold" : ""}`}>{it.title}</span>
          {sub ? <span className="block text-[12px] text-muted-foreground">{sub}</span> : null}
        </span>
        {unreadDot ? <span className="flex-none text-[12px] text-muted-foreground">{fmtWhen(it.publish_start_at, now)}</span> : null}
      </button>
      {open ? (
        <div id={id} className="px-4 pt-1 pb-3 pl-8">
          <div className={BODY} dangerouslySetInnerHTML={{ __html: sanitize(it.content) }} />
          {files.length ? (
            <ul className="mt-2 mb-0 list-none p-0 text-[13px]">
              {files.map((f, i) => (
                <li key={f.uuid ?? i}>
                  {f.uuid
                    ? <a className="text-primary underline" href={"/api/file/view/" + encodeURIComponent(f.uuid)} target="_blank" rel="noopener noreferrer">{f.file_name || f.name}</a>
                    : f.file_name}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </li>
  );
}
