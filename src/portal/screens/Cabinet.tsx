import { IconFileText, IconFolder } from "@tabler/icons-react";
import { useEffect, useRef, useState } from "react";
import { BusyOverlay } from "@/ui/BusyOverlay";
import { Spin } from "@/ui/Spin";
import { fetchSharedItems, type SharedItem } from "../api";
import { fmtSize, fmtYmd } from "../lib/blocks";

type Folder = { uuid: string; name: string };
type Shown = { stack: Folder[]; items: SharedItem[] | null }; // items が null なら失敗

const snap = (s: Folder[]) => s.map((f) => ({ uuid: f.uuid, name: f.name }));

/** history.state の muFs から積み直す。形が合わなければ最上位だけ */
function fromState(st: any, root: Folder): Folder[] {
  const m = st?.muFs;
  const ok = m && m.root === root.uuid && Array.isArray(m.stack) && m.stack.length
    && m.stack.every((f: any) => f && typeof f.uuid === "string" && typeof f.name === "string");
  return ok ? snap(m.stack) : [root];
}

const LINK = "cursor-pointer border-0 bg-transparent p-0 text-[13px] text-primary hover:underline";

/** 電子キャビネット(fileShare)。フォルダの移動はブラウザの履歴にも積む(戻る操作で 1 つ上へ。再読み込みでも同じ場所へ) */
export function Cabinet({ data }: { data: Record<string, any> }) {
  const root: Folder = { uuid: String(data.folderUuid ?? ""), name: String(data.header || "電子キャビネット") };
  const [stack, setStack] = useState<Folder[]>(() => fromState(history.state, root));
  const [shown, setShown] = useState<Shown | null>(null);
  const [busy, setBusy] = useState(true);
  const seq = useRef(0);

  const withState = (s: Folder[]) => ({ ...history.state, muFs: { root: root.uuid, stack: snap(s) } });
  const enter = (next: Folder[]) => {
    setStack(next);
    try { history.pushState(withState(next), ""); } catch { /* 履歴を触れなくても動く */ }
  };

  useEffect(() => {
    try { history.replaceState(withState(stack), ""); } catch { /* 同上 */ }
    const onPop = (e: PopStateEvent) => setStack(fromState(e.state, root));
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const my = ++seq.current;
    setBusy(true);
    fetchSharedItems(stack[stack.length - 1]!.uuid)
      .then((items) => { if (my === seq.current) setShown({ stack, items }); })
      .catch((e) => { console.error("[mu-portal]", e); if (my === seq.current) setShown({ stack, items: null }); })
      .finally(() => { if (my === seq.current) setBusy(false); });
  }, [stack]);

  if (!shown) return <div className="grid place-items-center py-12"><Spin className="size-8" /></div>;

  // 元の順序のままフォルダを先に並べる
  const visible = (shown.items ?? []).filter((it) => it && it.has_read_permission !== false);
  const folders = visible.filter((it) => !it.is_file);
  const files = visible.filter((it) => it.is_file);
  const atRoot = shown.stack.length === 1;
  const open = (it: SharedItem) => enter([...shown.stack, { uuid: String(it.uuid), name: String(it.name ?? "") }]);

  return (
    <BusyOverlay busy={busy}>
      <section className="overflow-hidden rounded-[4px] border border-border bg-card text-card-foreground">
        {atRoot ? (
          <div className="flex items-baseline gap-3 border-b border-border px-4 py-2.5">
            <h2 className="m-0 text-sm font-semibold">{root.name}</h2>
            {shown.items ? <span className="text-[12px] text-muted-foreground">{`${folders.length} フォルダ`}</span> : null}
          </div>
        ) : (
          <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-2.5 text-[13px]">
            <nav aria-label="フォルダの場所" className="min-w-0 [overflow-wrap:anywhere]">
              {shown.stack.map((f, i) => (
                <span key={i}>
                  {i ? " / " : null}
                  {i === shown.stack.length - 1
                    ? <b>{f.name}</b>
                    : <button type="button" className={LINK} onClick={() => enter(shown.stack.slice(0, i + 1))}>{f.name}</button>}
                </span>
              ))}
            </nav>
            <button type="button" className="h-8 flex-none cursor-pointer rounded-[4px] border border-border bg-card px-3 text-[13px] hover:bg-muted" onClick={() => enter(shown.stack.slice(0, -1))}>上のフォルダへ</button>
          </div>
        )}

        {!shown.items ? <p className="m-0 px-4 py-4 text-[13px] text-muted-foreground">読み込めませんでした</p> : null}
        {shown.items && !folders.length && !files.length ? <p className="m-0 px-4 py-4 text-[13px] text-muted-foreground">フォルダの中にファイルはありません</p> : null}

        {atRoot && folders.length ? (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(210px,1fr))] gap-2 p-4">
            {folders.map((it) => (
              <button key={it.uuid} type="button" onClick={() => open(it)} className="flex h-9 min-w-0 cursor-pointer items-center gap-2 rounded-[4px] border border-border bg-card px-3 text-left text-[13px] text-foreground hover:bg-muted">
                <IconFolder className="size-4.5 flex-none text-primary" />
                <span className="min-w-0 truncate">{it.name}</span>
              </button>
            ))}
          </div>
        ) : null}

        {(!atRoot && (folders.length || files.length)) || (atRoot && files.length) ? (
          <table className="w-full border-collapse text-[13px]">
            <thead>
              <tr className="border-b border-border text-left text-[12px] text-muted-foreground">
                <th className="px-4 py-2 font-normal">名前</th>
                <th className="w-24 px-2 py-2 font-normal">大きさ</th>
                <th className="w-28 px-4 py-2 font-normal">更新日</th>
              </tr>
            </thead>
            <tbody>
              {(atRoot ? [] : folders).map((it) => (
                <tr key={it.uuid} className="border-b border-border last:border-b-0">
                  <td className="px-4 py-2" colSpan={3}>
                    <button type="button" onClick={() => open(it)} className="flex cursor-pointer items-center gap-2 border-0 bg-transparent p-0 text-left text-[13px] font-bold text-foreground hover:underline">
                      <IconFolder className="size-4.5 flex-none text-primary" />
                      <span className="[overflow-wrap:anywhere]">{it.name}</span>
                    </button>
                  </td>
                </tr>
              ))}
              {files.map((it) => (
                <tr key={it.uuid} className="border-b border-border last:border-b-0">
                  <td className="px-4 py-2">
                    <a className="flex items-center gap-2 text-foreground no-underline hover:underline" href={"/api/shared-file/view/" + encodeURIComponent(it.uuid)} target="_blank" rel="noopener noreferrer">
                      <IconFileText className="size-4.5 flex-none text-muted-foreground" />
                      <span className="[overflow-wrap:anywhere]">{it.name}</span>
                    </a>
                  </td>
                  <td className="px-2 py-2 text-muted-foreground">{fmtSize(it.size)}</td>
                  <td className="px-4 py-2 text-muted-foreground">{fmtYmd(it.updated_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : null}
      </section>
    </BusyOverlay>
  );
}
