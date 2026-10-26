import { useEffect, useRef, useState, type MouseEvent } from "react";
import { fetchCategories, fetchNotices, fetchJson, setRead, type InfoItem } from "../api";
import { readAllPath, unreadTotal, type FlatCategory } from "../lib/lib";
import { NoticeDetail } from "./NoticeDetail";
import { NoticesRows, NoticesToolbar, type Filter } from "./NoticesList";

const PANEL = "min-w-0 overflow-hidden rounded-[4px] border border-border bg-card text-card-foreground";
const ARM_MS = 3000;
const SEARCH_MS = 400;

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
  const [armed, setArmed] = useState(false);
  const [allFail, setAllFail] = useState(false);
  const [detailFail, setDetailFail] = useState(false);
  const [reload, setReload] = useState(0);
  const seq = useRef(0); // 古い応答を捨てる
  const armTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const allBtn = useRef<HTMLButtonElement>(null);
  const opts = { query, unread: filter === "unread", pinned: filter === "pinned", category };

  const disarm = () => {
    clearTimeout(armTimer.current);
    setArmed(false);
  };
  const commit = (v: string) => {
    const q = v.trim();
    setQuery(q.length >= 2 ? q : ""); // 2 文字未満は絞り込まない
  };

  useEffect(() => {
    const t = setTimeout(() => commit(draft), SEARCH_MS);
    return () => clearTimeout(t);
  }, [draft]);

  useEffect(() => () => clearTimeout(armTimer.current), []);

  useEffect(() => {
    const my = ++seq.current;
    disarm();
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

  const markAll = async () => {
    setAllFail(false);
    if (!armed) {
      setArmed(true);
      armTimer.current = setTimeout(() => setArmed(false), ARM_MS);
      return;
    }
    disarm();
    try {
      await fetchJson(readAllPath({ pinned: filter === "pinned", category }));
      setReload((n) => n + 1);
    } catch (e) {
      console.error("[mu-portal]", e);
      setAllFail(true);
    }
  };

  // 確認待ちの間に別の操作をしたら元に戻す
  const onClick = (e: MouseEvent) => { if (armed && !allBtn.current?.contains(e.target as Node)) disarm(); };

  return (
    <div onClickCapture={onClick} className="flex min-h-full items-start gap-4 px-5 py-4">
      <section aria-label="一覧" className={`${PANEL} flex-[1_1_0] ${showDetail ? "max-[767px]:hidden" : ""}`}>
        <NoticesToolbar
          draft={draft} onDraft={setDraft} onCommit={() => commit(draft)}
          cats={cats} category={category} onCategory={setCategory}
          filter={filter} onFilter={setFilter} unread={unread} count={status === "error" ? null : meta.count}
          armed={armed} allFail={allFail} onAll={() => void markAll()} allRef={allBtn}
        />
        <NoticesRows
          rows={rows} status={status} sel={sel} more={meta.page < meta.pageTotal}
          onPick={(u) => { setSel(u); setDetailFail(false); setShowDetail(true); }}
          onMore={more} onRetry={() => setReload((n) => n + 1)}
        />
      </section>
      <article aria-label="詳細" className={`${PANEL} flex-[1.1_1_0] ${showDetail ? "" : "max-[767px]:hidden"}`}>
        <NoticeDetail item={rows.find((r) => r.uuid === sel) ?? null} fail={detailFail} onToggle={(it) => void toggle(it)} onBack={() => setShowDetail(false)} />
      </article>
    </div>
  );
}
