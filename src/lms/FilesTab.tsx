import { useEffect, useRef, useState, type DragEvent, type ReactNode } from "react";
import { ErrorNotice } from "@/ui/ErrorNotice";
import { PageLoading } from "@/ui/PageLoading";
import { errText, fetchDoc, LoginRequiredError } from "./api";
import {
  deleteDirDraft, deleteDraft, downloadDirDraft, formatSize, mkdirDraft, readFileArea, updateDirDraft, updateFileDraft, uploadDraft,
  type DraftFile, type FileArea,
} from "./draftFiles";
import { Box, Note } from "./parts";
import { crumbs, fileCount, fileKind, formatTime, listTree, parentOf, savePrivateFiles, usedBytes, type Tree } from "./privateFiles";
import { useLoad } from "./useLoad";

type Loaded = { area: FileArea; form: HTMLFormElement };
type Upload = { id: number; dir: string; name: string; size: number; pct?: number; error?: string };
type Dialog = { kind: "mkdir" } | { kind: "rename"; f: DraftFile } | { kind: "delete"; f: DraftFile };
type Drag = { dir: string; label: string; files: number | null };

const ROOT = "ファイル";
const BTN = "h-9 cursor-pointer rounded-[4px] border border-border bg-card px-4 text-[13.5px] hover:bg-muted disabled:cursor-default disabled:opacity-50";
const LINK = "cursor-pointer border-0 bg-transparent p-0 text-[13px] text-primary hover:underline disabled:cursor-default disabled:opacity-50";

/** files.php を読み直す。保存のたびに下書きが新しくなるので、そのつど itemid ごと取り直す */
async function loadFiles(): Promise<Loaded> {
  const doc = await fetchDoc("/user/files.php");
  const area = readFileArea(doc, "files_filemanager");
  const form = doc.querySelector<HTMLFormElement>("form.mform");
  if (!area || !form) throw new Error("プライベートファイルの欄が見つかりません");
  return { area, form };
}

export function FilesTab() {
  const l = useLoad(loadFiles, []);
  if (l.failed) return <ErrorNotice title="読み込めませんでした" message="プライベートファイルを取得できませんでした。" onRetry={l.reload} />;
  if (!l.data) return <PageLoading title="プライベートファイル" />;
  return <FilesBox init={l.data} />;
}

function Modal({ label, onClose, children }: { label: string; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-[rgb(34_27_43/.35)] p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" aria-label={label} className="flex w-full max-w-sm flex-col gap-4 rounded-[4px] border border-border bg-card p-4 text-card-foreground shadow-lg">{children}</div>
    </div>
  );
}

const SMALL = "h-8 cursor-pointer rounded-[4px] border border-border bg-card px-3 text-[13px] hover:bg-muted";

function NameDialog({ label, initial, ok, onClose, onOk }: { label: string; initial: string; ok: string; onClose: () => void; onOk: (name: string) => void }) {
  const [name, setName] = useState(initial);
  const v = name.trim();
  const valid = !!v && !v.includes("/") && v !== "." && v !== "..";
  return (
    <Modal label={label} onClose={onClose}>
      <form className="flex flex-col gap-4" onSubmit={(e) => { e.preventDefault(); if (valid) onOk(v); }}>
        <label className="flex flex-col gap-1 text-[13px]">{label}
          <input autoFocus value={name} onChange={(e) => setName(e.target.value)} className="h-9 w-full rounded-[4px] border border-input bg-card px-2.5 text-[13.5px]" />
        </label>
        <div className="flex justify-end gap-2">
          <button type="button" className={SMALL} onClick={onClose}>キャンセル</button>
          <button type="submit" disabled={!valid} className="h-8 cursor-pointer rounded-[4px] bg-primary px-3 text-[13px] text-primary-foreground disabled:opacity-50">{ok}</button>
        </div>
      </form>
    </Modal>
  );
}

function FilesBox({ init }: { init: Loaded }) {
  const [tree, setTree] = useState<Tree | null>(null);
  const [path, setPath] = useState("/");
  const [uploads, setUploads] = useState<Upload[]>([]);
  const [drag, setDrag] = useState<Drag | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(0);
  const [zipping, setZipping] = useState(false);
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const cur = useRef(init);
  const chain = useRef<Promise<void>>(Promise.resolve());
  const moving = useRef<{ name: string; dir: string } | null>(null);
  const next = useRef(0);

  const dir = tree && path in tree ? path : "/";
  const items = tree?.[dir] ?? [];
  const label = (p: string) => (p === "/" ? ROOT : crumbs(p).at(-1)!.name);
  const limit = cur.current.area.areamaxbytes ?? 0;
  const used = tree ? usedBytes(tree) : 0;

  const fail = (e: unknown) => { if (e instanceof LoginRequiredError) location.reload(); else setError(errText(e)); };
  const reload = async () => {
    const l = await loadFiles();
    cur.current = l;
    setTree(await listTree(l.area));
  };
  useEffect(() => { listTree(init.area).then(setTree, (e) => { fail(e); setTree({}); }); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /** 下書きの操作は 1 つずつ。job が false 以外なら form を保存し、成否に関わらず読み直す(下書きが変わるため) */
  const run = (job: () => Promise<boolean | void>) => {
    setBusy((n) => n + 1);
    setError(null);
    chain.current = chain.current.then(async () => {
      try {
        if ((await job()) !== false) await savePrivateFiles(cur.current.form, cur.current.area.itemid);
      } catch (e) { fail(e); }
      try { await reload(); } catch (e) { fail(e); }
      setUploads((us) => us.filter((u) => u.error));
      setBusy((n) => n - 1);
    });
  };
  const patch = (id: number, p: Partial<Upload>) => setUploads((us) => us.map((u) => (u.id === id ? { ...u, ...p } : u)));

  const add = (files: File[], to: string) => {
    let left = limit > 0 ? limit - used : Infinity;
    let count = tree ? fileCount(tree) : 0;
    // uploadDraft は同名を上書きするので、先に弾く(同時に選んだ中の重複も)
    const names = new Set((tree?.[to] ?? []).map((f) => f.filename));
    run(async () => {
      let ok = 0;
      for (const file of files) {
        const id = next.current++;
        setUploads((us) => [...us, { id, dir: to, name: file.name, size: file.size, pct: 0 }]);
        const r = names.has(file.name)
          ? { ok: false as const, error: `同じ名前「${file.name}」があります` }
          : file.size > left
          ? { ok: false as const, error: `容量を超えます(${formatSize(file.size)}。残り ${formatSize(Math.max(left, 0))})` }
          : await uploadDraft(cur.current.area, file, (pct) => patch(id, { pct }), count, to);
        if (r.ok) { left -= file.size; count++; names.add(file.name); ok++; patch(id, { pct: 100 }); } else patch(id, { pct: undefined, error: r.error });
      }
      return ok > 0;
    });
  };

  const taken = (to: string, name: string, except?: DraftFile) => (tree?.[to] ?? []).some((f) => f.filename === name && f !== except);
  const move = (name: string, from: string, to: string) => {
    if (from === to) return;
    if (taken(to, name)) return setError(`「${label(to)}」に同じ名前「${name}」があります`);
    run(() => updateFileDraft(cur.current.area, from, name, to, name));
  };
  const rename = (f: DraftFile, name: string) => {
    if (name === f.filename) return;
    if (taken(dir, name, f)) return setError(`同じ名前「${name}」があります`);
    run(() => (f.folder ? updateDirDraft(cur.current.area, f.filepath!, name, dir) : updateFileDraft(cur.current.area, dir, f.filename, dir, name)));
  };
  const remove = (f: DraftFile) => run(() => (f.folder ? deleteDirDraft(cur.current.area, f.filepath!) : deleteDraft(cur.current.area, f.filename, dir)));
  const zip = () => {
    setZipping(true);
    downloadDirDraft(cur.current.area, dir).then((u) => location.assign(u), fail).finally(() => setZipping(false));
  };

  // ドロップ先は data-dropdir を持つ行(フォルダ・上のフォルダ)。無ければ今のフォルダ
  const hasFiles = (e: DragEvent) => [...e.dataTransfer.types].includes("Files");
  const targetOf = (e: DragEvent) => {
    const el = (e.target as HTMLElement).closest<HTMLElement>("[data-dropdir]");
    return el ? { dir: el.dataset.dropdir!, label: el.dataset.droplabel!, row: true } : { dir, label: label(dir), row: false };
  };
  const over = (e: DragEvent) => {
    if (busy || tree === null || (!hasFiles(e) && !moving.current)) return;
    const t = targetOf(e);
    if (moving.current && !t.row) return setDrag(null); // 移動はフォルダの行にだけ置ける
    e.preventDefault();
    // ドラッグ中はファイルの大きさが読めない(ブラウザの制限)ので、個数と残り容量だけ出す
    const files = hasFiles(e) ? e.dataTransfer.items.length : null;
    setDrag((d) => (d && d.dir === t.dir && d.files === files ? d : { dir: t.dir, label: t.label, files }));
  };
  const drop = (e: DragEvent) => {
    e.preventDefault();
    const t = targetOf(e);
    setDrag(null);
    if (busy || tree === null) return;
    if (moving.current) { if (t.row) move(moving.current.name, moving.current.dir, t.dir); moving.current = null; } else if (hasFiles(e)) add([...e.dataTransfer.files], t.dir);
  };

  const here = uploads.filter((u) => u.dir === dir);
  const empty = tree !== null && !items.length && !here.length;
  const hot = (p: string) => (drag?.dir === p ? "bg-sidebar-accent" : "");
  const th = "px-3 py-2 text-left text-[12.5px] font-semibold";
  const td = "px-3 py-2 align-middle";

  return (
    <div
      onDragOver={over}
      onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setDrag(null); }}
      onDrop={drop}
      className={`flex flex-col gap-4 rounded-[4px] ${drag?.files != null ? "outline outline-2 outline-primary" : ""}`}
    >
      <Box title="プライベートファイル">
        <div className="flex flex-col gap-3 border-b border-border px-4 py-3">
          <nav aria-label="場所" className="flex flex-wrap items-center gap-1 text-[13px]">
            {[{ name: ROOT, path: "/" }, ...crumbs(dir)].map((c, i, all) => (
              <span key={c.path} className="flex items-center gap-1">
                {i ? <span className="text-muted-foreground">/</span> : null}
                {i === all.length - 1 ? <b>{c.name}</b> : <button type="button" className={LINK} onClick={() => setPath(c.path)}>{c.name}</button>}
              </span>
            ))}
          </nav>
          {limit > 0 ? (
            <div className="flex flex-col gap-1">
              <div role="progressbar" aria-label="使っている容量" aria-valuemin={0} aria-valuemax={limit} aria-valuenow={Math.min(used, limit)} className="h-1.5 overflow-hidden rounded-full bg-muted">
                <div className={`h-full ${used >= limit ? "bg-error" : "bg-primary"}`} style={{ width: `${Math.min(100, (used / limit) * 100)}%` }} />
              </div>
              <span className="text-[12px] text-muted-foreground">{`${formatSize(used)} / ${formatSize(limit)}(1 つ ${formatSize(cur.current.area.maxbytes)} まで)`}</span>
            </div>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <label className={`inline-flex h-9 items-center rounded-[4px] bg-primary px-4 text-[13.5px] text-primary-foreground ${busy || tree === null ? "opacity-50" : "cursor-pointer hover:opacity-90"}`}>
              ファイルを追加
              <input type="file" multiple hidden disabled={busy > 0 || tree === null} onChange={(e) => { add([...(e.target.files ?? [])], dir); e.target.value = ""; }} />
            </label>
            <button type="button" className={BTN} disabled={busy > 0 || tree === null} onClick={() => setDialog({ kind: "mkdir" })}>フォルダを作る</button>
            <button type="button" className={BTN} disabled={busy > 0 || zipping || tree === null || !items.length} onClick={zip}>{zipping ? "用意しています…" : "まとめてダウンロード"}</button>
          </div>
          {drag?.files != null ? (
            <p role="status" className="m-0 text-[13px] font-semibold text-primary">
              {`離すと「${drag.label}」に追加(${drag.files} 個)`}
              {limit > 0 ? <span className="font-normal text-muted-foreground">{` ・ 残り ${formatSize(Math.max(limit - used, 0))}`}</span> : null}
            </p>
          ) : null}
          {busy > 0 ? <span role="status" className="text-[12.5px] text-muted-foreground">保存しています…</span> : null}
          {error ? <p role="alert" className="m-0 text-[13px] text-error">{error}</p> : null}
        </div>
        {tree === null ? <Note>読み込んでいます…</Note> : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-[13.5px]">
              <thead>
                <tr className="border-b border-border">
                  <th scope="col" className={`${th} w-24`}>種類</th>
                  <th scope="col" className={th}>名前</th>
                  <th scope="col" className={`${th} w-24`}>大きさ</th>
                  <th scope="col" className={`${th} w-40`}>更新日時</th>
                  <th scope="col" className={`${th} w-40`}><span className="sr-only">操作</span></th>
                </tr>
              </thead>
              <tbody>
                {dir !== "/" ? (
                  <tr data-dropdir={parentOf(dir)} data-droplabel={label(parentOf(dir))} className={`border-b border-border ${hot(parentOf(dir))}`}>
                    <td className={td}><Tag>フォルダ</Tag></td>
                    <td className={td} colSpan={4}><button type="button" className={LINK} onClick={() => setPath(parentOf(dir))}>{`‹ 上のフォルダ(${label(parentOf(dir))})`}</button></td>
                  </tr>
                ) : null}
                {items.map((f) => (
                  <tr
                    key={`${f.folder ? "d" : "f"}${f.filepath ?? ""}${f.filename}`}
                    {...(f.folder ? { "data-dropdir": f.filepath, "data-droplabel": f.filename } : { draggable: busy === 0 })}
                    onDragStart={f.folder ? undefined : (e) => { moving.current = { name: f.filename, dir }; e.dataTransfer.setData("text/plain", f.filename); }}
                    onDragEnd={() => { moving.current = null; setDrag(null); }}
                    className={`border-b border-border ${f.folder ? hot(f.filepath!) : ""}`}
                  >
                    <td className={td}><Tag>{fileKind(f.filename, f.folder)}</Tag></td>
                    <td className={`${td} [overflow-wrap:anywhere]`}>
                      {f.folder ? <button type="button" className="cursor-pointer border-0 bg-transparent p-0 text-left text-[13.5px] font-semibold text-foreground hover:underline" onClick={() => setPath(f.filepath!)}>{f.filename}</button>
                        : f.url ? <a className="text-primary hover:underline" href={f.url} download={f.filename}>{f.filename}</a> : f.filename}
                    </td>
                    <td className={`${td} text-muted-foreground`}>{f.size !== null ? formatSize(f.size) : ""}</td>
                    <td className={`${td} text-muted-foreground`}>{formatTime(f.time)}</td>
                    <td className={td}>
                      <span className="flex gap-3">
                        <button type="button" className={LINK} disabled={busy > 0} onClick={() => setDialog({ kind: "rename", f })}>名前を変える</button>
                        <button type="button" className={`${LINK} !text-error`} disabled={busy > 0} onClick={() => setDialog({ kind: "delete", f })}>削除</button>
                      </span>
                    </td>
                  </tr>
                ))}
                {here.map((u) => (
                  <tr key={`u${u.id}`} className="border-b border-border">
                    <td className={td}><Tag>{fileKind(u.name)}</Tag></td>
                    <td className={`${td} [overflow-wrap:anywhere]`}>
                      {u.name}
                      {u.pct !== undefined ? <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full bg-primary" style={{ width: `${u.pct}%` }} /></div> : null}
                      {u.error ? <span className="block text-[12px] text-error">{u.error}</span> : null}
                    </td>
                    <td className={`${td} text-muted-foreground`}>{formatSize(u.size)}</td>
                    <td className={`${td} text-muted-foreground`}>{u.pct !== undefined ? `${u.pct}%` : ""}</td>
                    <td className={td}>{u.error ? <button type="button" className={LINK} onClick={() => setUploads((us) => us.filter((x) => x.id !== u.id))}>消す</button> : null}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {empty ? <Note>まだファイルがありません。「ファイルを追加」か、ここへのドロップで置けます</Note> : null}
          </div>
        )}
      </Box>
      {dialog?.kind === "mkdir" ? (
        <NameDialog label="フォルダの名前" initial="" ok="作る" onClose={() => setDialog(null)} onOk={(name) => {
          setDialog(null);
          if (taken(dir, name)) return setError(`同じ名前「${name}」があります`);
          run(() => mkdirDraft(cur.current.area, name, dir));
        }} />
      ) : null}
      {dialog?.kind === "rename" ? (
        <NameDialog label="新しい名前" initial={dialog.f.filename} ok="変える" onClose={() => setDialog(null)} onOk={(name) => { const f = dialog.f; setDialog(null); rename(f, name); }} />
      ) : null}
      {dialog?.kind === "delete" ? (
        <Modal label="削除の確認" onClose={() => setDialog(null)}>
          <p className="m-0 text-sm">{dialog.f.folder ? `フォルダ「${dialog.f.filename}」を、中のファイルごと削除しますか?` : `「${dialog.f.filename}」を削除しますか?`}</p>
          <div className="flex justify-end gap-2">
            <button type="button" className={SMALL} onClick={() => setDialog(null)}>キャンセル</button>
            <button type="button" className={`${SMALL} text-error`} onClick={() => { const f = dialog.f; setDialog(null); remove(f); }}>削除</button>
          </div>
        </Modal>
      ) : null}
    </div>
  );
}

const Tag = ({ children }: { children: ReactNode }) => <span className="inline-block rounded-[3px] border border-border bg-muted px-1.5 text-[11px] text-muted-foreground">{children}</span>;
