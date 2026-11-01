import { useEffect, useRef, useState } from "react";
import { fetchCategories, fetchNotices, fetchJson, setRead, type InfoItem } from "../api";
import { readAllPath, unreadTotal, type FlatCategory } from "../lib/lib";
import { NoticeDetail } from "./NoticeDetail";
import { allScope, NoticesRows, NoticesToolbar, type Filter } from "./NoticesList";

const PANEL = "min-w-0 overflow-hidden rounded-[4px] border border-border bg-card text-card-foreground";
const SEARCH_MS = 400;

/** すべて既読の確認(作りは SignOutDialog と同じ) */
function ReadAllDialog({ scope, run, onClose }: { scope: string; run: () => Promise<void>; onClose: () => void }) {
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const ok = useRef<HTMLButtonElement>(null);
  useEffect(() => ok.current?.focus(), []);
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && !busy && onClose();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onClose, busy]);
  const go = () => {
    setBusy(true);
    setFailed(false);
    run().catch((e) => { console.error("[mu-portal]", e); setBusy(false); setFailed(true); });
  };
  const btn = "h-8 cursor-pointer rounded-[4px] border border-border bg-card px-3 text-[13px] hover:bg-muted disabled:cursor-default disabled:opacity-60 max-[767px]:h-11";
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-[rgb(34_27_43/.35)] p-4" onMouseDown={(e) => e.target === e.currentTarget && !busy && onClose()}>
      <div role="dialog" aria-modal="true" aria-label="すべて既読の確認" className="flex w-full max-w-sm flex-col gap-4 rounded-[4px] border border-border bg-card p-4 text-card-foreground shadow-lg">
        <p className="m-0 text-sm">{scope}のお知らせを、すべて既読にしますか?</p>
        {failed ? <p role="alert" className="m-0 text-[13px] text-error">既読にできませんでした</p> : null}
        <div className="flex justify-end gap-2 max-[767px]:grid max-[767px]:grid-cols-2">
          <button type="button" className={btn} disabled={busy} onClick={onClose}>キャンセル</button>
          <button ref={ok} type="button" className={btn} disabled={busy} onClick={go}>{busy ? "既読にしています" : "既読にする"}</button>
        </div>
      </div>
    </div>
  );
}

/** お知らせ一覧(左に一覧、右に本文)。狭い画面は一覧だけを出し、選ぶと本文に替わる */
export function NoticesScreen({ initialCategory = "" }: { initialCategory?: string }) {
  const [draft, setDraft] = useState("");
  const [query, setQuery] = useState(""); // 2 文字以上のときだけ入る
  const [filter, setFilter] = useState<Filter>("all");
  const [category, setCategory] = useState(initialCategory);
  const [rows, setRows] = useState<InfoItem[]>([]);
  const [meta, setMeta] = useState({ page: 1, pageTotal: 1, count: null as number | null });
  const [status, setStatus] = useState<"loading" | "ok" | "error">("loading");
  const [sel, setSel] = useState<string | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [cats, setCats] = useState<FlatCategory[]>([]);
  const [unread, setUnread] = useState<number | null>(null);
  const [confirm, setConfirm] = useState(false);
  const [detailFail, setDetailFail] = useState(false);
  const [reload, setReload] = useState(0);
  const seq = useRef(0); // 古い応答を捨てる
  const opts = { query, unread: filter === "unread", pinned: filter === "pinned", category };

  const commit = (v: string) => {
    const q = v.trim();
    setQuery(q.length >= 2 ? q : ""); // 2 文字未満は絞り込まない
  };

  useEffect(() => {
    const t = setTimeout(() => commit(draft), SEARCH_MS);
    return () => clearTimeout(t);
  }, [draft]);

  useEffect(() => {
    const my = ++seq.current;
    setStatus("loading");
    fetchNotices({ ...opts, page: 1 })
      .then((r) => {
        if (my !== seq.current) return;
        setRows(r.items);
        setMeta({ page: 1, pageTotal: r.pageTotal, count: r.count ?? r.items.length });
        setSel(r.items[0]?.uuid ?? null); // 本文を空にしない。開いても既読にはしない
        setShowDetail(false);
        setDetailFail(false);
        setStatus("ok");
      })
      .catch((e) => {
        if (my !== seq.current) return;
        console.error("[mu-portal]", e);
        setStatus("error");
      });
  }, [query, filter, category, reload]);

  useEffect(() => {
    fetchCategories()
      .then((flat) => { setCats(flat); setUnread(unreadTotal(flat)); })
      .catch((e) => console.warn("[mu-portal] category tree", e));
  }, [reload]);

  const more = () => {
    const my = ++seq.current;
    setStatus("loading");
    fetchNotices({ ...opts, page: meta.page + 1 })
      .then((r) => {
        if (my !== seq.current) return;
        setRows((p) => [...p, ...r.items]);
        setMeta((m) => ({ ...m, page: m.page + 1, pageTotal: r.pageTotal }));
        setStatus("ok");
      })
      .catch((e) => {
        if (my !== seq.current) return;
        console.error("[mu-portal]", e);
        setStatus("error");
      });
  };

  const toggle = async (it: InfoItem) => {
    const to = it.is_read === false;
    try {
      await setRead(it.uuid, to);
      setRows((p) => p.map((r) => (r.uuid === it.uuid ? { ...r, is_read: to } : r)));
      setUnread((n) => (n == null ? n : Math.max(0, n + (to ? -1 : 1))));
      setDetailFail(false);
    } catch (e) {
      console.error("[mu-portal]", e);
      setDetailFail(true);
    }
  };

  const markAll = () => fetchJson(readAllPath({ pinned: filter === "pinned", category })).then(() => { setConfirm(false); setReload((n) => n + 1); });

  return (
    <div className="flex min-h-full items-start gap-4 px-5 py-4">
      {confirm ? <ReadAllDialog scope={allScope(category, filter)} run={markAll} onClose={() => setConfirm(false)} /> : null}
      <section inert={confirm} aria-label="一覧" className={`${PANEL} flex-[1_1_0] ${showDetail ? "max-[767px]:hidden" : ""}`}>
        <NoticesToolbar
          draft={draft} onDraft={setDraft} onCommit={() => commit(draft)}
          cats={cats} category={category} onCategory={setCategory}
          filter={filter} onFilter={setFilter} unread={unread} count={status === "error" ? null : meta.count}
          onAll={() => setConfirm(true)}
        />
        <NoticesRows
          rows={rows} status={status} sel={sel} more={meta.page < meta.pageTotal}
          onPick={(u) => { setSel(u); setDetailFail(false); setShowDetail(true); }}
          onMore={more} onRetry={() => setReload((n) => n + 1)}
        />
      </section>
      <article inert={confirm} aria-label="詳細" className={`${PANEL} flex-[1.1_1_0] ${showDetail ? "" : "max-[767px]:hidden"}`}>
        <NoticeDetail item={rows.find((r) => r.uuid === sel) ?? null} fail={detailFail} onToggle={(it) => void toggle(it)} onBack={() => setShowDetail(false)} />
      </article>
    </div>
  );
}
