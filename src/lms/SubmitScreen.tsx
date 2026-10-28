import { useEffect, useRef, useState } from "react";
import { Checkbox } from "@/ui/Checkbox";
import { ErrorNotice } from "@/ui/ErrorNotice";
import { fetchStatus, htmlToText, submit, type AssignPage, type StatusRow, type SubmitForm } from "./assign";
import { AssignHead } from "./AssignScreen";
import { deleteDraft, formatSize, limitText, listDraft, uploadDraft, type FileArea } from "./draftFiles";
import { Box } from "./parts";

type FileRow = { id: number; name: string; size: number | null; pct?: number; error?: string; removing?: boolean };

/** 下書き置き場の一覧・追加・削除。「提出する」を押すまで提出には反映されない */
function FilesBox({ area, disabled, onUploading }: { area: FileArea; disabled: boolean; onUploading: (b: boolean) => void }) {
  const [rows, setRows] = useState<FileRow[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [over, setOver] = useState(false);
  const next = useRef(0);
  const count = useRef(0);
  const patch = (id: number, p: Partial<FileRow> | null) => setRows((rs) => (rs ?? []).flatMap((r) => (r.id !== id ? [r] : p ? [{ ...r, ...p }] : [])));

  useEffect(() => { listDraft(area).then((l) => setRows(l.map((f) => ({ id: next.current++, name: f.filename, size: f.size }))), (e: unknown) => { setLoadError(e instanceof Error ? e.message : String(e)); setRows([]); }); }, [area]);
  useEffect(() => {
    count.current = (rows ?? []).filter((r) => !r.error).length;
    // 一覧の読み込み中・上げている途中・外している途中は、提出も追加もさせない(途中の状態で提出が保存されないように)
    onUploading(rows === null || rows.some((r) => r.pct !== undefined || r.removing));
  }, [rows, onUploading]);
  const busy = disabled || rows === null;

  const add = (files: File[]) => {
    for (const file of files) {
      const id = next.current++;
      const n = count.current++;
      setRows((rs) => [...(rs ?? []), { id, name: file.name, size: file.size, pct: 0 }]);
      uploadDraft(area, file, (pct) => patch(id, { pct }), n).then((r) => {
        if (r.ok) setRows((rs) => (rs ?? []).filter((x) => x.id === id || x.name !== file.name || x.pct !== undefined || x.error).map((x) => (x.id === id ? { id, name: file.name, size: file.size } : x)));
        else { count.current--; patch(id, { pct: undefined, error: r.error }); }
      });
    }
  };
  const remove = (r: FileRow) => {
    if (r.error) return patch(r.id, null);
    patch(r.id, { removing: true });
    deleteDraft(area, r.name).then(() => patch(r.id, null), () => patch(r.id, { removing: false, error: "外せませんでした" }));
  };

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); if (!busy) setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => { e.preventDefault(); setOver(false); if (!busy) add([...e.dataTransfer.files]); }}
      className={`rounded-[4px] ${over ? "outline outline-2 outline-primary" : ""}`}
    >
      <Box title="ファイル">
        {loadError ? <p className="m-0 px-4 py-2 text-[12.5px] text-error">{`一覧を読めませんでした: ${loadError}`}</p> : null}
        <ul className="m-0 list-none p-0">
          {(rows ?? []).map((r) => (
            <li key={r.id} className="flex flex-col gap-1 border-b border-border px-4 py-2.5 text-[13px]">
              <div className="flex items-center gap-3">
                <span className="min-w-0 flex-1 truncate">{r.name}</span>
                {r.size !== null ? <span className="text-muted-foreground">{formatSize(r.size)}</span> : null}
                {r.removing ? <span className="text-muted-foreground">外しています…</span>
                  : r.pct === undefined ? <button type="button" disabled={disabled} onClick={() => remove(r)} className="cursor-pointer border-0 bg-transparent p-0 text-primary hover:underline disabled:opacity-60">{r.error ? "消す" : "外す"}</button> : <span className="w-10 text-right text-muted-foreground">{`${r.pct}%`}</span>}
              </div>
              {r.pct !== undefined ? <div className="h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full bg-primary" style={{ width: `${r.pct}%` }} /></div> : null}
              {r.error ? <span className="text-[12px] text-error">{r.error}</span> : null}
            </li>
          ))}
          {rows && !rows.length ? <li className="px-4 py-2.5 text-[13px] text-muted-foreground">まだファイルがありません</li> : null}
        </ul>
        <div className="flex flex-col gap-1 px-4 py-3">
          <label className={`inline-flex h-9 w-fit items-center rounded-[4px] border border-border bg-card px-4 text-[13.5px] ${busy ? "opacity-60" : "cursor-pointer hover:bg-muted"}`}>
            ファイルを選ぶ
            <input type="file" multiple hidden disabled={busy} onChange={(e) => { add([...(e.target.files ?? [])]); e.target.value = ""; }} />
          </label>
          <span className="text-[12px] text-muted-foreground">{`ここにドラッグ&ドロップもできます。${limitText(area)}`}</span>
          <span className="text-[12px] text-muted-foreground">外す・上げるは「提出する」を押すまで先生には見えません</span>
        </div>
      </Box>
    </div>
  );
}

// 利用者ごとに分ける(同じタブで別の人がログインし直しても前の人の書きかけが出ない)
let user = "";
const key = (id: number | string | null) => `mu-lms-draft-${user}-${id}`;
const load = (id: number | string | null): string | null => { try { return sessionStorage.getItem(key(id)); } catch { return null; } };
const save = (id: number | string | null, v: string | null): void => {
  try { if (v === null) sessionStorage.removeItem(key(id)); else sessionStorage.setItem(key(id), v); } catch { /* 保存できなくても書ける */ }
};

export function SubmitScreen({ page, form }: { page: AssignPage; form: SubmitForm }) {
  user = form.fields.find(([k]) => k === "userid")?.[1] ?? "";
  const [text, setText] = useState(() => load(page.id) ?? (form.markdown ? form.text ?? "" : htmlToText(form.text ?? "")));
  const [markdown, setMarkdown] = useState(() => { const m = load(`${page.id}-md`); return m === null ? form.markdown : m === "1"; });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState<StatusRow[] | null | "loading" | undefined>(undefined);
  const back = `/mod/assign/view.php?id=${page.id}`;

  const send = () => {
    setBusy(true);
    setError(null);
    setStatus(undefined);
    submit(form, text, markdown).then(() => { save(page.id, null); save(`${page.id}-md`, null); }, (e: unknown) => {
      setError(e instanceof Error ? e.message : String(e));
      setBusy(false);
      // 失敗と判定されても提出できている場合があるので、課題の画面で今の状況を確かめる
      if (page.id === null) return setStatus(null);
      setStatus("loading");
      fetchStatus(page.id).then(setStatus);
    });
  };

  return (
    <div className="mx-auto flex w-full max-w-[1000px] flex-col gap-4 p-4">
      <AssignHead page={page} title={`${page.title}を提出`} />
      <div className="flex flex-wrap items-start gap-4">
        <div className="flex min-w-0 flex-[2_1_380px] flex-col gap-3">
          {form.text !== null
            ? (
              <div className="flex flex-col gap-1">
                <textarea
                  aria-label="本文"
                  rows={12}
                  value={text}
                  disabled={busy}
                  onChange={(e) => { setText(e.target.value); save(page.id, e.target.value); }}
                  className="w-full resize-y rounded-[4px] border border-border bg-card p-3 text-[13.5px]"
                />
                <span className="self-end text-[12px] text-muted-foreground">{`${Array.from(text.replace(/\s/g, "")).length} 字`}</span>
                <div className="text-[12px]"><Checkbox label="Markdown で書く" checked={markdown} onChange={(v) => { setMarkdown(v); save(`${page.id}-md`, v ? "1" : "0"); }} disabled={busy} /></div>
                {!form.markdown && /<(?!\/?(p|br)\b)[a-z]/i.test(form.text) ? <span className="text-[12px] text-error">今の本文には書式・リンク・画像があります。書き換えて提出すると外れます(書き換えなければそのまま)</span> : null}
              </div>
            )
            : null}
          {form.files ? <FilesBox area={form.files} disabled={busy} onUploading={setUploading} /> : null}
        </div>
        <div className="w-full flex-[1_1_220px]">
          <Box title="期限">
            <div className="flex flex-col gap-1 px-4 py-3">
              {page.dates.length
                ? page.dates.map((d) => <p key={d.label} className="m-0 text-[13px]"><span className="text-muted-foreground">{d.label}: </span>{d.value}</p>)
                : <p className="m-0 text-[13px] text-muted-foreground">-</p>}
            </div>
          </Box>
        </div>
      </div>
      {error ? <ErrorNotice title="提出できませんでした" message={error} /> : null}
      {error && status === "loading" ? <p className="m-0 text-[12.5px] text-muted-foreground">課題の画面で提出状況を確かめています…</p> : null}
      {error && status !== "loading" && status !== undefined
        ? (
          <div className="flex flex-col gap-1 text-[13px]">
            {status?.length
              ? (
                <>
                  <span className="text-muted-foreground">課題の画面では</span>
                  {status.map((r) => <span key={r.label}>{`${r.label}: ${r.text}`}</span>)}
                </>
              )
              : <span className="text-muted-foreground">提出状況を読めませんでした</span>}
            <a className="w-fit text-primary hover:underline" href={back}>課題の画面を開く</a>
          </div>
        )
        : null}
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" disabled={busy || uploading} onClick={send} className="h-9 cursor-pointer rounded-[4px] bg-primary px-5 text-[13.5px] text-primary-foreground hover:opacity-90 disabled:cursor-default disabled:opacity-60">{busy ? "提出しています…" : "提出する"}</button>
        <a className="inline-flex h-9 items-center rounded-[4px] border border-border bg-card px-4 text-[13.5px] hover:bg-muted" href={back}>やめる</a>
        <span className="text-[12px] text-muted-foreground">押すと保存して提出します(確定が要る課題は、このあと課題の画面で「提出を確定する」)</span>
      </div>
    </div>
  );
}
