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

// 狭い画面では箱の下に全幅 44px のボタンとして出す「すべて見る」系
const FOOT = "flex h-11 w-full cursor-pointer items-center justify-center border-0 border-t border-border bg-transparent p-0 text-[13px] text-primary no-underline hover:bg-muted min-[768px]:hidden";

/** 白地に 1px の枠。上に見出しの帯(題名と、右に操作)。狭い画面は Panel と同じ全幅の白い帯 */
function Box({ title, actions, foot, children }: { title: string; actions?: ReactNode; foot?: ReactNode; children: ReactNode }) {
  return (
    <section className="overflow-hidden rounded-[4px] border border-border bg-card text-card-foreground max-[767px]:-mx-4 max-[767px]:rounded-none max-[767px]:border-x-0">
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-2.5">
        <h2 className="m-0 text-sm font-semibold max-[767px]:font-bold">{title}</h2>
        <div className="flex items-center gap-2">{actions}</div>
      </div>
      {children}
      {foot}
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
      <span className={`w-24 flex-none text-[12.5px] max-[767px]:w-20 ${e.overdue ? "text-error" : "text-muted-foreground"}`}>
        {fmtDue(e.due)}{e.overdue ? <span className="block font-semibold">{e.closed ? "締切" : "期限切れ"}</span> : null}
      </span>
      <span className="min-w-0 flex-1">
        <a className="block text-[13.5px] font-semibold text-foreground hover:underline [overflow-wrap:anywhere]" href={e.url} target="_blank" rel="noopener noreferrer">{dueName(e.name)}</a>
        {e.course || e.kind === "questionnaire" ? (
          // アンケートの回答済み・締切の判定は実機未確認
          <span className="block text-[12px] text-muted-foreground">{[e.kind === "questionnaire" ? "アンケート(α版)" : "", courseName(e.course)].filter(Boolean).join("、")}</span>
        ) : null}
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
          <a className={`${LINK} max-[767px]:hidden`} href={LMS_URL} target="_blank" rel="noopener noreferrer">MU LMS で見る</a>
        </>
      }
      foot={<a className={FOOT} href={LMS_URL} target="_blank" rel="noopener noreferrer">MU LMS で見る</a>}
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
  const tile = "flex min-h-[132px] flex-[1_1_240px] flex-col justify-between p-5 text-white no-underline sm:p-6 max-[767px]:h-16 max-[767px]:min-h-0 max-[767px]:justify-center max-[767px]:px-4 max-[767px]:py-2";
  const tileTitle = "text-[26px] font-bold tracking-[.04em] max-[767px]:text-[18px]";
  return (
    <div className="mx-auto flex max-w-[1200px] flex-col gap-4 p-4">
      <section aria-label="サービス" className="overflow-hidden rounded-[4px] border border-border bg-card">
        <div className="flex flex-wrap max-[767px]:grid max-[767px]:grid-cols-2">
          {data.muscatUrl ? (
            <a className={tile} style={{ background: "#541B86" }} href={data.muscatUrl} target="_blank" rel="noopener noreferrer">
              <span className={tileTitle}>MUSCAT</span>
              <span className="text-[13px] opacity-85">授業・シラバス・掲示</span>
            </a>
          ) : null}
          {data.lmsUrl ? (
            <a className={tile} style={{ background: "#26212E" }} href={data.lmsUrl} target="_blank" rel="noopener noreferrer">
              <span className={tileTitle}>MU LMS</span>
              <span className="text-[13px] opacity-85">課題・教材</span>
            </a>
          ) : null}
          {links.length ? (
            <nav aria-label="その他リンク" className="flex flex-[1_1_240px] flex-col justify-center gap-2 px-[22px] py-[14px] text-[13px] max-[767px]:col-span-2 max-[767px]:gap-0 max-[767px]:px-4 max-[767px]:py-0">
              {links.map((l) => <a key={l.href} className="text-primary hover:underline max-[767px]:flex max-[767px]:h-11 max-[767px]:items-center max-[767px]:border-t max-[767px]:border-border max-[767px]:first:border-t-0" href={l.href} target="_blank" rel="noopener noreferrer">{l.text}</a>)}
            </nav>
          ) : null}
        </div>
        {callout ? <p role="note" className="m-0 border-t border-border bg-muted px-[22px] py-2 text-[12.5px] [&_a]:text-primary [&_a]:underline" dangerouslySetInnerHTML={{ __html: sanitize(callout) }} /> : null}
      </section>

      {/* 狭い画面は列の箱を外し、order で「LMS → お知らせ → 個人呼出 → 学年暦」に並べ替える */}
      <div className="flex flex-wrap items-start gap-4 max-[767px]:flex-col max-[767px]:items-stretch">
        <div className="flex min-w-0 flex-[1_1_420px] flex-col gap-4 max-[767px]:contents">
          <div className="max-[767px]:order-3">
            <Box title="個人呼出">
              <ListBody list={personal} empty="配信されているお知らせはありません" row={(it) => (
                <InfoRow key={it.uuid} it={it} unreadDot={false} now={now} sub={[it.publish_from, fmtWhen(it.publish_start_at, now)].filter(Boolean).join("、")} />
              )} />
            </Box>
          </div>
          {calendar ? <div className="max-[767px]:order-4"><AcademicCalendar data={calendar} load={loadMonth} now={now} /></div> : null}
        </div>
        <div className="flex min-w-0 flex-[1_1_420px] flex-col gap-4 max-[767px]:contents">
          <div className="max-[767px]:order-2"><Box
            title="大学からのお知らせ"
            actions={
              <>
                {unread ? <span className="rounded-[3px] bg-primary px-1.5 text-[11px] font-semibold leading-[17px] text-primary-foreground">{`未読 ${unread}`}</span> : null}
                <button type="button" className={`${LINK} max-[767px]:hidden`} onClick={() => navigate(NOTICES_URL)}>
                  {`すべて見る${news?.count != null ? `(${news.count}件)` : ""}`}
                </button>
              </>
            }
            foot={<button type="button" className={FOOT} onClick={() => navigate(NOTICES_URL)}>{`すべて見る${news?.count != null ? `(${news.count}件)` : ""}`}</button>}
          >
            <ListBody list={news} empty="配信されているお知らせはありません" row={(it) => (
              <InfoRow key={it.uuid} it={it} unreadDot now={now} sub={[it.category?.name, it.publish_from].filter(Boolean).join("、")} />
            )} />
          </Box></div>
          <div className="max-[767px]:order-1"><LmsBox lms={data.lms} /></div>
        </div>
      </div>
    </div>
  );
}
