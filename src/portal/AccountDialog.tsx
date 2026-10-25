import { IconX } from "@tabler/icons-react";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { ErrorNotice } from "@/ui/ErrorNotice";
import { Spin } from "@/ui/Spin";
import { fetchActionLog, fetchDevices, fetchMe, proxyUserMenu, type DeviceItem, type LogItem, type Paged, type PortalUser } from "./api";
import { fmtFull } from "./lib/lib";

type Tab = "info" | "device" | "log";

const ACTIVE_TAB = "bg-sidebar-accent font-semibold text-sidebar-accent-foreground shadow-[inset_3px_0_0_var(--mu-primary)] max-sm:shadow-[inset_0_-3px_0_var(--mu-primary)]";
const TH = "border-b border-border bg-muted px-3 py-2 text-left text-[12.5px] font-semibold whitespace-nowrap text-muted-foreground";
// 最後の列(摘要)だけ折り返す。ほかは「サイン/イン」のように途中で切れた(実機で確認)
const TD = "border-b border-border px-3 py-2 align-top text-[13.5px] whitespace-nowrap last:whitespace-normal";
// 摘要は {"message":"SAML login for Web"} の形で来る。中の message だけ出す
const summary = (s?: string | null) => {
  try { const j = JSON.parse(s ?? ""); return typeof j?.message === "string" ? j.message : (s ?? ""); } catch { return s ?? ""; }
};

const ACTION: Record<string, string> = { login: "サインイン", logout: "サインアウト" };
const KIND: Record<string, string> = { web: "Web", app: "アプリ" };
const PLATFORM: Record<string, string> = { pc: "PC", android: "Android", ios: "iOS" };
const DEVICE: Record<string, string> = { android: "Android", ios: "iOS" };
const lbl = (m: Record<string, string>, k?: string) => (k ? m[k] ?? k : "");
const when = (s?: number) => (s ? fmtFull(s) : "");

type AccountRow = { label: string; value: string };
const OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const;

/** 情報タブの行。画面に出す項目だけ並べる */
export function meRows(u: PortalUser): AccountRow[] {
  // 元の小窓の「接続テナント」は本番/試験の固定の文字(リリース/ステージング)で利用者の情報ではないので出さない
  return [
    { label: "ユーザーID", value: u.user_id ?? "" },
    { label: "個人ID", value: u.personal_id ?? "" },
    { label: "カスタム属性", value: OPTIONS.map((i) => u[`option_${i}`]).filter(Boolean).join("、") },
    { label: "氏名", value: u.name ?? "" },
    { label: "氏名(カナ)", value: u.name_kana ?? "" },
    { label: "氏名(英)", value: u.name_alphabet ?? "" },
    { label: "メールアドレス", value: u.email ?? "" },
    { label: "所属", value: (u.display_group_names ?? []).join("\n") },
  ];
}

/** 読み込み →失敗なら再試行つきの表示 → 成功なら render。タブを開いたとき一度だけ読む */
function useLoad<T>(load: () => Promise<T>) {
  const [st, setSt] = useState<{ s: "loading" | "error" | "ok"; data?: T }>({ s: "loading" });
  const [n, setN] = useState(0);
  useEffect(() => {
    let live = true;
    setSt({ s: "loading" });
    load().then((data) => live && setSt({ s: "ok", data }), (e) => { console.error("[mu-portal]", e); if (live) setSt({ s: "error" }); });
    return () => { live = false; };
  }, [n]); // eslint-disable-line react-hooks/exhaustive-deps
  return [st, () => setN(n + 1)] as const;
}

const Center = () => <div className="flex justify-center p-10"><Spin /></div>;
const Fail = ({ retry }: { retry: () => void }) => <ErrorNotice title="読み込めませんでした" message="" onRetry={retry} />;

function InfoTab() {
  const [st, retry] = useLoad<AccountRow[]>(() => fetchMe().then(meRows));
  if (st.s === "loading") return <Center />;
  if (st.s === "error") return <Fail retry={retry} />;
  return (
    <dl className="m-0 border-t border-l border-border">
      {st.data!.map((r, i) => (
        <div key={i} className="grid grid-cols-[160px_1fr] max-sm:grid-cols-[110px_1fr]">
          <dt className="border-r border-b border-border bg-muted px-3 py-2 text-[12.5px] text-muted-foreground">{r.label}</dt>
          <dd className="m-0 border-r border-b border-border px-3 py-2 text-[13.5px] break-words whitespace-pre-line">
            {r.value || <span className="text-muted-foreground">登録されていません</span>}
          </dd>
        </div>
      ))}
    </dl>
  );
}

/** 1 ページ目を読み、「さらに表示」で次を足す表。横にはみ出したら表の箱の中で流す */
function PagedTable<T>({ load, head, row, empty, note, foot }: {
  load: (page: number) => Promise<Paged<T>>; head: string[]; row: (x: T) => ReactNode[]; empty: string; note?: ReactNode; foot?: ReactNode;
}) {
  const [rows, setRows] = useState<T[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(1);
  const [state, setState] = useState<"loading" | "error" | "ok">("loading");
  const go = useCallback((p: number) => {
    setState("loading");
    load(p).then((r) => { setRows((a) => (p === 1 ? r.items : [...a, ...r.items])); setPage(p); setTotal(r.pageTotal); setState("ok"); },
      (e) => { console.error("[mu-portal]", e); setState("error"); });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => go(1), [go]);
  if (state === "error" && !rows.length) return <Fail retry={() => go(1)} />;
  if (state === "loading" && !rows.length) return <Center />;
  return (
    <div className="flex flex-col gap-3">
      {note ? <p className="m-0 text-[13px] text-muted-foreground">{note}</p> : null}
      {rows.length ? (
        <div className="overflow-x-auto rounded-[4px] border border-border">
          <table className="w-full border-collapse">
            <thead><tr>{head.map((h) => <th key={h} className={TH}>{h}</th>)}</tr></thead>
            <tbody>{rows.map((x, i) => <tr key={i}>{row(x).map((c, j) => <td key={j} className={TD}>{c}</td>)}</tr>)}</tbody>
          </table>
        </div>
      ) : <p className="m-0 text-[13px] text-muted-foreground">{empty}</p>}
      {state === "error" ? <ErrorNotice title="読み込めませんでした" message="" onRetry={() => go(page + 1)} /> : null}
      {page < total && state === "ok" ? (
        <div><button type="button" onClick={() => go(page + 1)} className="h-8 cursor-pointer rounded-[4px] border border-border bg-card px-3 text-[13px] hover:bg-muted">さらに表示</button></div>
      ) : null}
      {state === "loading" ? <Center /> : null}
      {foot}
    </div>
  );
}

/** アカウントとセキュリティ(読み取りだけ)。Esc・外側クリックで閉じる */
export function AccountDialog({ userName, onClose }: { userName: string; onClose: () => void }) {
  const [tab, setTab] = useState<Tab>("info");
  const [seen, setSeen] = useState<Tab[]>(["info"]); // 一度開いたタブは閉じるまで残す(再読み込みしない)
  const closeBtn = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    closeBtn.current?.focus();
    return () => prev?.focus?.();
  }, []);
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onClose]);
  const pick = (t: Tab) => { setTab(t); setSeen((s) => (s.includes(t) ? s : [...s, t])); };
  const tabs: [Tab, string][] = [["info", userName ? `${userName} さんの情報` : "あなたの情報"], ["device", "登録デバイス"], ["log", "アクティビティログ"]];
  const show = (t: Tab) => (tab === t ? "" : "hidden");
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgb(34_27_43/.35)]" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" aria-labelledby="mu-acct-title"
        className="flex max-h-[calc(100vh-64px)] w-[min(880px,calc(100vw-32px))] flex-col rounded-[4px] border border-border bg-card text-card-foreground shadow-lg">
        <div className="flex items-center justify-between border-b border-border px-5 py-3">
          <h2 id="mu-acct-title" className="m-0 text-[15px] font-bold">アカウントとセキュリティ</h2>
          <button ref={closeBtn} type="button" aria-label="閉じる" onClick={onClose}
            className="flex size-8 cursor-pointer items-center justify-center rounded-[4px] border border-border bg-card hover:bg-muted"><IconX className="size-4" /></button>
        </div>
        <div className="flex min-h-0 flex-1 max-sm:flex-col">
          <div role="tablist" aria-orientation="vertical" className="flex w-52 flex-none flex-col border-r border-border max-sm:w-auto max-sm:flex-row max-sm:overflow-x-auto max-sm:border-r-0 max-sm:border-b">
            {tabs.map(([t, label]) => (
              <button key={t} type="button" role="tab" aria-selected={tab === t} onClick={() => pick(t)}
                className={`h-10 cursor-pointer px-5 text-left text-[13.5px] whitespace-nowrap hover:bg-muted max-sm:px-4 ${tab === t ? ACTIVE_TAB : ""}`}>{label}</button>
            ))}
          </div>
          <div className="min-w-0 flex-1 overflow-auto p-5">
            {seen.includes("info") ? <div className={show("info")}><InfoTab /></div> : null}
            {seen.includes("device") ? (
              <div className={show("device")}>
                <PagedTable<DeviceItem> load={fetchDevices} head={["登録日", "端末の種類"]} empty="登録されている端末はありません"
                  note="端末をなくしたときは、その端末をサインアウトしてください。"
                  row={(d) => [when(d.created_at), lbl(DEVICE, d.device_type)]}
                  foot={<div><button type="button" onClick={() => { proxyUserMenu("account"); onClose(); }}
                    className="h-8 cursor-pointer rounded-[4px] border border-border bg-card px-3 text-[13px] hover:bg-muted">端末のサインアウトは元の画面で開く</button></div>} />
              </div>
            ) : null}
            {seen.includes("log") ? (
              <div className={show("log")}>
                <PagedTable<LogItem> load={fetchActionLog} head={["記録日時", "種別", "端末", "接続元", "摘要"]} empty="記録はありません"
                  row={(l) => [when(l.created_at), lbl(ACTION, l.action), [lbl(KIND, l.type), lbl(PLATFORM, l.platform)].filter(Boolean).join(" / "), (l.remote_address ?? "").split(",")[0]!.trim(), summary(l.description)]} />
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
