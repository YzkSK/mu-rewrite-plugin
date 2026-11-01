import { useEffect, useRef, useState } from "react";
import { IconX } from "@tabler/icons-react";
import { errText } from "./api";
import { deleteDraft, formatSize, limitText, listDraft, uploadDraft, type FileArea } from "./draftFiles";
import { Box } from "./parts";

type FileRow = { id: number; name: string; size: number | null; pct?: number; error?: string; removing?: boolean };

/** 下書き置き場の一覧・追加・削除。「提出する」を押すまで提出には反映されない */
export function SubmitFilesBox({ area, disabled, onUploading }: { area: FileArea; disabled: boolean; onUploading: (b: boolean) => void }) {
  const [rows, setRows] = useState<FileRow[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [over, setOver] = useState(false);
  const next = useRef(0);
  const fileCount = useRef(0);
  const patch = (id: number, p: Partial<FileRow> | null) => setRows((rs) => (rs ?? []).flatMap((r) => (r.id !== id ? [r] : p ? [{ ...r, ...p }] : [])));

  useEffect(() => { listDraft(area).then((l) => setRows(l.filter((f) => !f.folder).map((f) => ({ id: next.current++, name: f.filename, size: f.size }))), (e: unknown) => { setLoadError(errText(e)); setRows([]); }); }, [area]);
  useEffect(() => {
    fileCount.current = (rows ?? []).filter((r) => !r.error).length;
    // 一覧の読み込み中・上げている途中・外している途中は、提出も追加もさせない(途中の状態で提出が保存されないように)
    onUploading(rows === null || rows.some((r) => r.pct !== undefined || r.removing));
  }, [rows, onUploading]);
  const busy = disabled || rows === null;

  const add = (files: File[]) => {
    for (const file of files) {
      const id = next.current++;
      const n = fileCount.current++;
      setRows((rs) => [...(rs ?? []), { id, name: file.name, size: file.size, pct: 0 }]);
      uploadDraft(area, file, (pct) => patch(id, { pct }), n).then((r) => {
        if (r.ok) setRows((rs) => (rs ?? []).filter((x) => x.id === id || x.name !== file.name || x.pct !== undefined || x.error).map((x) => (x.id === id ? { id, name: file.name, size: file.size } : x)));
        else { fileCount.current--; patch(id, { pct: undefined, error: r.error }); }
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
                  : r.pct === undefined ? <button type="button" disabled={disabled} onClick={() => remove(r)} aria-label={r.error ? "消す" : "外す"} className="cursor-pointer border-0 bg-transparent p-0 text-primary hover:underline disabled:opacity-60 max-[767px]:grid max-[767px]:size-9 max-[767px]:place-items-center max-[767px]:text-muted-foreground"><span className="max-[767px]:hidden">{r.error ? "消す" : "外す"}</span><IconX size={18} className="min-[768px]:hidden" /></button> : <span className="w-10 text-right text-muted-foreground">{`${r.pct}%`}</span>}
              </div>
              {r.pct !== undefined ? <div className="h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full bg-primary" style={{ width: `${r.pct}%` }} /></div> : null}
              {r.error ? <span className="text-[12px] text-error">{r.error}</span> : null}
            </li>
          ))}
          {rows && !rows.length ? <li className="px-4 py-2.5 text-[13px] text-muted-foreground">まだファイルがありません</li> : null}
        </ul>
        <div className="flex flex-col gap-1 px-4 py-3">
          <label className={`inline-flex h-9 w-fit items-center rounded-[4px] border border-border bg-card px-4 text-[13.5px] max-[767px]:h-11 ${busy ? "opacity-60" : "cursor-pointer hover:bg-muted"}`}>
            ファイルを選ぶ
            <input type="file" multiple hidden disabled={busy} onChange={(e) => { add([...(e.target.files ?? [])]); e.target.value = ""; }} />
          </label>
          <span className="text-[12px] text-muted-foreground"><span className="max-[767px]:hidden">ここにドラッグ&ドロップもできます。</span>{limitText(area)}</span>
          <span className="text-[12px] text-muted-foreground">外す・上げるは「提出する」を押すまで先生には見えません</span>
        </div>
      </Box>
    </div>
  );
}
