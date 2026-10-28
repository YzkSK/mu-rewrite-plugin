import { useEffect, useState, type ReactNode } from "react";
import type { InfoItem, InfoList } from "../api";
import type { TopData } from "../data";
import { fmtDue, fmtWhen, type CalEvent } from "../lib/lib";
import { courseName, dueName, type LmsDue, type LmsResult } from "../lib/lms";
import { errorToast } from "@/ui/Toast";
import { sanitize } from "../lib/sanitize";
import { navigate, NOTICES_URL } from "../route";
import { AcademicCalendar } from "./AcademicCalendar";
import { InfoRow } from "./InfoRow";

const LMS_URL = "https://musashino-u.myopenlms.net/my/";
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

function ListBody({ list, empty, row }: { list: InfoList | null; empty: string; row: (it: InfoItem) => ReactNode }) {
  if (!list) return <Note>読み込めませんでした</Note>;
  if (!list.items.length) return <Note>{empty}</Note>;
  return <ul className="m-0 list-none p-0">{list.items.map(row)}</ul>;
}

function DueItem({ e }: { e: LmsDue }) {
  return (
    <li className="flex gap-3 border-b border-border px-4 py-2.5 last:border-b-0">
      <span className={`w-24 flex-none text-[12.5px] ${e.overdue ? "text-error" : "text-muted-foreground"}`}>
        {fmtDue(e.due)}{e.overdue ? <span className="block font-semibold">{e.closed ? "締切" : "期限切れ"}</span> : null}
      </span>
      <span className="min-w-0 flex-1">
        <a className="block text-[13.5px] font-semibold text-foreground hover:underline [overflow-wrap:anywhere]" href={e.url} target="_blank" rel="noopener noreferrer">{dueName(e.name)}</a>
        {e.course ? <span className="block text-[12px] text-muted-foreground">{courseName(e.course)}</span> : null}
      </span>
    </li>
  );
}

function LmsBox({ lms: given }: { lms: LmsResult | Promise<LmsResult> }) {
  const [lms, setLms] = useState<LmsResult | null>(given instanceof Promise ? null : given);
  useEffect(() => {
    let alive = true;
    if (given instanceof Promise) void given.then((r) => alive && setLms(r));
    else setLms(given);
    return () => {
      alive = false;
    };
  }, [given]);
  // ログインが切れていて黙って入り直せなかったときは、ログインへ案内する(描画中ではなくここで出す)
  useEffect(() => {
    if (lms && "login" in lms && !lms.login) errorToast("MU LMS にログインしてください", "ログインが切れているため、提出期限を読み込めませんでした。", { label: "MU LMS にログイン", href: "https://musashino-u.myopenlms.net/login/index.php" });
  }, [lms]);
  const all = lms && "login" in lms && lms.login ? [...lms.events].sort((a, b) => a.due - b.due) : [];
  // 締め切られた(もう出せない)期限切れは並べず、件数の 1 行に畳む
  const events = all.filter((e) => !e.closed);
  const closed = all.filter((e) => e.closed);
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
      {!lms ? <Note>読み込み中…</Note>
        : "error" in lms ? <Note>読み込めませんでした</Note>
        : !lms.login ? <Note>MU LMS にログインすると表示されます</Note>
        : !all.length ? <Note>提出期限の近い課題はありません</Note>
        : (
          <>
            {events.length ? <ul className="m-0 list-none p-0">{events.map((e, i) => <DueItem key={i} e={e} />)}</ul> : <Note>出せる課題はありません</Note>}
            {closed.length ? (
              <details className="border-t border-border">
                <summary className="cursor-pointer px-4 py-2 text-[12.5px] text-muted-foreground hover:bg-muted">{`締め切られた未提出 ${closed.length} 件`}</summary>
                <ul className="m-0 list-none p-0">{closed.map((e, i) => <DueItem key={i} e={e} />)}</ul>
              </details>
            ) : null}
          </>
        )}
    </Box>
  );
}

type Props = { data: TopData; loadMonth: (y: number, m: number) => Promise<CalEvent[]>; now?: Date };

/** トップページ。サービス帯 + 左右 2 列(個人呼出・学年暦 / お知らせ・LMS) */
export function TopPage({ data, loadMonth, now = new Date() }: Props) {
  const { news, personal, calendar, links, callout } = data;
  const unread = data.newsUnread ?? news?.items.filter((i) => i.is_read === false).length ?? 0;
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
