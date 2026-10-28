import { useEffect, useRef, useState } from "react";
import { ErrorNotice } from "@/ui/ErrorNotice";
import { PageLoading } from "@/ui/PageLoading";
import { isHttp } from "@/portal/lib/sanitize";
import { fmtTime, loadConversations, loadNotices, loadThread, sendMessage, type Conversation, type Notice, type Thread } from "./messages";
import { Box, Note, Row } from "./parts";
import { useLoad } from "./useLoad";

type Tab = "notifications" | "messages";
const BTN = "h-9 cursor-pointer rounded-[4px] bg-primary px-4 text-[13.5px] text-primary-foreground disabled:cursor-default disabled:opacity-50";

function Notices({ userId, initial }: { userId: number; initial?: Notice[] }) {
  const n = useLoad(() => loadNotices(userId), [userId], initial);
  if (n.failed) return <ErrorNotice title="読み込めませんでした" message="通知を取得できませんでした。" onRetry={n.reload} />;
  if (!n.data) return <PageLoading title="通知" />;
  return (
    <Box title="通知">
      {!n.data.length ? <Note>通知はありません</Note> : (
        <ul className="m-0 list-none p-0">
          {n.data.map((x) => (
            <Row key={x.id}>
              <span aria-label={x.read ? undefined : "未読"} className={`mt-1.5 h-2 w-2 flex-none rounded-full ${x.read ? "" : "bg-primary"}`} />
              <span className="min-w-0 flex-1 text-[13.5px] [overflow-wrap:anywhere]">
                {x.url && isHttp(x.url) ? <a className="text-foreground hover:underline" href={x.url}>{x.subject}</a> : x.subject}
                {x.text && x.text !== x.subject ? <span className="block text-[12px] text-muted-foreground">{x.text}</span> : null}
              </span>
              <span className="h-fit flex-none text-[12px] text-muted-foreground">{fmtTime(x.at)}</span>
            </Row>
          ))}
        </ul>
      )}
    </Box>
  );
}

function Conversations({ userId, initial }: { userId: number; initial?: Conversation[] }) {
  const c = useLoad(() => loadConversations(userId), [userId], initial);
  if (c.failed) return <ErrorNotice title="読み込めませんでした" message="会話の一覧を取得できませんでした。" onRetry={c.reload} />;
  if (!c.data) return <PageLoading title="メッセージ" />;
  return (
    <Box title="会話">
      {!c.data.length ? <Note>会話はありません。コースの「先生」の欄から送れます</Note> : (
        <ul className="m-0 list-none p-0">
          {c.data.map((x) => (
            <Row key={x.id}>
              <span className="min-w-0 flex-1 text-[13.5px] [overflow-wrap:anywhere]">
                {x.otherId ? <a className="font-semibold text-foreground hover:underline" href={`/message/index.php?id=${x.otherId}`}>{x.name}</a> : <span className="font-semibold">{x.name}</span>}
                {x.unread ? <span className="ml-2 rounded-[3px] bg-primary px-1 text-[11px] text-primary-foreground">{x.unread}</span> : null}
                <span className="block truncate text-[12px] text-muted-foreground">{x.last}</span>
              </span>
              <span className="h-fit flex-none text-[12px] text-muted-foreground">{x.at ? fmtTime(x.at) : ""}</span>
            </Row>
          ))}
        </ul>
      )}
    </Box>
  );
}

function Chat({ userId, otherId, initial }: { userId: number; otherId: number; initial?: Thread }) {
  const t = useLoad(() => loadThread(userId, otherId), [userId, otherId], initial);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const composer = useRef<HTMLDivElement>(null);
  // 読み込み・送信のあと(messages が替わる)に、送る欄を下端に合わせる(最新の発言はそのすぐ上に見える)
  useEffect(() => { composer.current?.scrollIntoView({ block: "end" }); }, [t.data?.messages]);
  if (t.failed) return <ErrorNotice title="読み込めませんでした" message="会話を取得できませんでした。" onRetry={t.reload} />;
  if (!t.data) return <PageLoading title="メッセージ" />;

  const send = async () => {
    const body = text.trim();
    if (!body || sending) return;
    setSending(true);
    setError("");
    try {
      await sendMessage(otherId, body);
      setText("");
      t.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "送れませんでした");
    } finally {
      setSending(false);
    }
  };

  return (
    <Box title={`${t.data.name || "先生"} さん`} actions={<a className="text-[12.5px] text-primary hover:underline" href="/message/index.php">‹ 会話一覧</a>}>
      {!t.data.messages.length ? <Note>まだメッセージはありません</Note> : (
        <ul className="m-0 flex list-none flex-col gap-2 p-4">
          {t.data.messages.map((m) => (
            <li key={m.id} className={`max-w-[80%] rounded-[4px] border border-border px-3 py-2 text-[13.5px] ${m.mine ? "self-end bg-sidebar-accent" : "self-start bg-card"}`}>
              <span className="whitespace-pre-wrap [overflow-wrap:anywhere]">{m.text}</span>
              <span className="mt-1 block text-[11px] text-muted-foreground">{fmtTime(m.at)}</span>
            </li>
          ))}
        </ul>
      )}
      <div ref={composer} className="flex flex-col gap-2 border-t border-border p-4">
        <label className="text-[12.5px] text-muted-foreground" htmlFor="mu-msg-body">先生に送る</label>
        <textarea id="mu-msg-body" value={text} rows={4} disabled={sending} onChange={(e) => setText(e.target.value)} className="w-full rounded-[4px] border border-border bg-card p-2 text-[13.5px]" />
        {error ? <p role="alert" className="m-0 text-[13px] text-error">{error}</p> : null}
        <div><button type="button" className={BTN} disabled={sending || !text.trim()} onClick={() => void send()}>{sending ? "送っています" : "送る"}</button></div>
      </div>
    </Box>
  );
}

type Props = { path: string; search: string; userId: number | null; initial?: { notices?: Notice[]; conversations?: Conversation[]; thread?: Thread } };

/** 通知とメッセージ。/message/index.php?id=N なら、その人との会話と送る欄 */
export function MessagesScreen({ path, search, userId, initial }: Props) {
  const [tab, setTab] = useState<Tab>(path.startsWith("/message/output/popup/") ? "notifications" : "messages");
  const other = Number(new URLSearchParams(search).get("id")) || null;
  if (userId === null) return <div className="p-4"><ErrorNotice title="読み込めませんでした" message="ユーザーが分かりませんでした。" /></div>;
  return (
    <div className="mx-auto flex w-full max-w-[800px] flex-col gap-4 p-4">
      <div role="group" aria-label="種類" className="flex w-fit overflow-hidden rounded-[4px] border border-border">
        {([["notifications", "通知"], ["messages", "メッセージ"]] as const).map(([k, label]) => (
          <button key={k} type="button" aria-pressed={k === tab} onClick={() => setTab(k)} className={`h-9 cursor-pointer border-r border-border px-4 text-[13.5px] last:border-r-0 ${k === tab ? "bg-primary text-primary-foreground" : "bg-card hover:bg-muted"}`}>{label}</button>
        ))}
      </div>
      {tab === "notifications" ? <Notices userId={userId} initial={initial?.notices} />
        : other ? <Chat userId={userId} otherId={other} initial={initial?.thread} />
        : <Conversations userId={userId} initial={initial?.conversations} />}
    </div>
  );
}
