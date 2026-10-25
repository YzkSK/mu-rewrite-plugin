import { useId, useState, type ReactNode } from "react";
import type { InfoItem, InfoList } from "../api";
import type { TopData } from "../data";
import { fmtDue, fmtWhen, type CalEvent } from "../lib/lib";
import { courseName, dueName, type LmsResult } from "../lib/lms";
import { sanitize } from "../lib/sanitize";
import { navigate, NOTICES_URL } from "../route";
import { AcademicCalendar } from "./AcademicCalendar";

const LMS_URL = "https://musashino-u.myopenlms.net/my/";
const BODY = "text-[13px] leading-relaxed [&_a]:text-primary [&_a]:underline [&_img]:max-w-full [&_p]:my-1 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_table]:border-collapse [&_td]:border [&_td]:border-border [&_td]:px-1";
const LINK = "cursor-pointer border-0 bg-transparent p-0 text-[12.5px] text-primary hover:underline";

/** 白地に 1px の枠。上に見出しの帯(題名と、右に操作) */
function Box({ title, actions, children }: { title: string; actions?: ReactNode; children: ReactNode }) {
  return (
    <section className="overflow-hidden rounded-[4px] border border-border bg-card text-card-foreground">
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-2.5">
        <h2 className="m-0 text-sm font-semibold">{title}</h2>
        <div className="flex items-center gap-2">{actions}</div>
      </div>
      {children}
    </section>
  );
}

const Note = ({ children }: { children: ReactNode }) => <p className="m-0 px-4 py-4 text-[13px] text-muted-foreground">{children}</p>;

/** 1 件。押すと本文と添付が下に開く */
function InfoRow({ it, sub, unreadDot, now }: { it: InfoItem; sub: string; unreadDot: boolean; now: Date }) {
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
        className="flex w-full cursor-pointer items-start gap-2 border-0 bg-transparent px-4 py-2.5 text-left text-inherit hover:bg-muted"
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

function ListBody({ list, empty, row }: { list: InfoList | null; empty: string; row: (it: InfoItem) => ReactNode }) {
  if (!list) return <Note>読み込めませんでした</Note>;
  if (!list.items.length) return <Note>{empty}</Note>;
  return <ul className="m-0 list-none p-0">{list.items.map(row)}</ul>;
}

function LmsBox({ lms }: { lms: LmsResult }) {
  const events = "login" in lms && lms.login ? [...lms.events].sort((a, b) => a.due - b.due) : [];
  const overdue = events.filter((e) => e.overdue).length;
  return (
    <Box
      title="LMS の提出期限"
      actions={
        <>
          {overdue ? <span className="rounded-[3px] bg-error px-1.5 text-[11px] font-semibold leading-[17px] text-error-foreground">{`期限切れ ${overdue}`}</span> : null}
          <a className={LINK} href={LMS_URL} target="_blank" rel="noopener noreferrer">MU LMS で見る</a>
        </>
      }
    >
      {"error" in lms ? <Note>読み込めませんでした</Note>
        : !lms.login ? <Note>MU LMS にログインすると表示されます</Note>
        : !events.length ? <Note>提出期限の近い課題はありません</Note>
        : (
          <ul className="m-0 list-none p-0">
            {events.map((e, i) => (
              <li key={i} className="flex gap-3 border-b border-border px-4 py-2.5 last:border-b-0">
                <span className={`w-24 flex-none text-[12.5px] ${e.overdue ? "text-error" : "text-muted-foreground"}`}>
                  {fmtDue(e.due)}{e.overdue ? <span className="block font-semibold">期限切れ</span> : null}
                </span>
                <span className="min-w-0 flex-1">
                  <a className="block text-[13.5px] font-semibold text-foreground hover:underline [overflow-wrap:anywhere]" href={e.url} target="_blank" rel="noopener noreferrer">{dueName(e.name)}</a>
                  {e.course ? <span className="block text-[12px] text-muted-foreground">{courseName(e.course)}</span> : null}
                </span>
              </li>
            ))}
          </ul>
        )}
    </Box>
  );
}

type Props = { data: TopData; loadMonth: (y: number, m: number) => Promise<CalEvent[]>; now?: Date };

/** トップページ。サービス帯 + 左右 2 列(個人呼出・学年暦 / お知らせ・LMS) */
export function TopPage({ data, loadMonth, now = new Date() }: Props) {
  const { news, personal, calendar, links, callout } = data;
  const unread = news?.items.filter((i) => i.is_read === false).length ?? 0;
  const tile = "flex min-h-[132px] flex-[1_1_240px] flex-col justify-between p-5 text-white no-underline sm:p-6";
  return (
    <div className="mx-auto flex max-w-[1200px] flex-col gap-4 p-4">
      <section aria-label="サービス" className="overflow-hidden rounded-[4px] border border-border bg-card">
        <div className="flex flex-wrap">
          {data.muscatUrl ? (
            <a className={tile} style={{ background: "#541B86" }} href={data.muscatUrl} target="_blank" rel="noopener noreferrer">
              <span className="text-[26px] font-bold tracking-[.04em]">MUSCAT</span>
              <span className="text-[13px] opacity-85">授業・シラバス・掲示</span>
            </a>
          ) : null}
          {data.lmsUrl ? (
            <a className={tile} style={{ background: "#26212E" }} href={data.lmsUrl} target="_blank" rel="noopener noreferrer">
              <span className="text-[26px] font-bold tracking-[.04em]">MU LMS</span>
              <span className="text-[13px] opacity-85">課題・教材</span>
            </a>
          ) : null}
          {links.length ? (
            <nav aria-label="その他リンク" className="flex flex-[1_1_240px] flex-col justify-center gap-2 px-[22px] py-[14px] text-[13px]">
              {links.map((l) => <a key={l.href} className="text-primary hover:underline" href={l.href} target="_blank" rel="noopener noreferrer">{l.text}</a>)}
            </nav>
          ) : null}
        </div>
        {callout ? <p role="note" className="m-0 border-t border-border bg-muted px-[22px] py-2 text-[12.5px] [&_a]:text-primary [&_a]:underline" dangerouslySetInnerHTML={{ __html: sanitize(callout) }} /> : null}
      </section>

      <div className="flex flex-wrap items-start gap-4">
        <div className="flex min-w-0 flex-[1_1_420px] flex-col gap-4">
          <Box title="個人呼出">
            <ListBody list={personal} empty="配信されているお知らせはありません" row={(it) => (
              <InfoRow key={it.uuid} it={it} unreadDot={false} now={now} sub={[it.publish_from, fmtWhen(it.publish_start_at, now)].filter(Boolean).join("、")} />
            )} />
          </Box>
          {calendar ? <AcademicCalendar data={calendar} load={loadMonth} now={now} /> : null}
        </div>
        <div className="flex min-w-0 flex-[1_1_420px] flex-col gap-4">
          <Box
            title="大学からのお知らせ"
            actions={
              <>
                {unread ? <span className="rounded-[3px] bg-primary px-1.5 text-[11px] font-semibold leading-[17px] text-primary-foreground">{`未読 ${unread}`}</span> : null}
                <button type="button" className={LINK} onClick={() => navigate(NOTICES_URL)}>
                  {`すべて見る${news?.count != null ? `(${news.count}件)` : ""}`}
                </button>
              </>
            }
          >
            <ListBody list={news} empty="配信されているお知らせはありません" row={(it) => (
              <InfoRow key={it.uuid} it={it} unreadDot now={now} sub={[it.category?.name, it.publish_from].filter(Boolean).join("、")} />
            )} />
          </Box>
          <LmsBox lms={data.lms} />
        </div>
      </div>
    </div>
  );
}
