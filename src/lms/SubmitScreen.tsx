import { useEffect, useRef, useState } from "react";
import { type CmdKey, defaultValueCtx, Editor, editorViewCtx, editorViewOptionsCtx, rootCtx, serializerCtx } from "@milkdown/kit/core";
import { history, redoCommand, undoCommand } from "@milkdown/kit/plugin/history";
import { listener, listenerCtx } from "@milkdown/kit/plugin/listener";
import { commonmark, toggleLinkCommand, createCodeBlockCommand, insertHrCommand, toggleEmphasisCommand, toggleInlineCodeCommand, toggleStrongCommand, wrapInBlockquoteCommand, wrapInBulletListCommand, wrapInHeadingCommand, wrapInOrderedListCommand } from "@milkdown/kit/preset/commonmark";
import type { Node } from "@milkdown/kit/prose/model";
import { callCommand } from "@milkdown/kit/utils";
import { IconArrowBackUp, IconArrowForwardUp, IconBlockquote, IconBold, IconCode, IconH2, IconItalic, IconLink, IconList, IconListNumbers, IconSeparatorHorizontal, IconSourceCode, type Icon } from "@tabler/icons-react";
import { ErrorNotice } from "@/ui/ErrorNotice";
import { fetchStatus, htmlToText, submit, type AssignPage, type StatusRow, type SubmitForm } from "./assign";
import { AssignHead } from "./AssignScreen";
import { deleteDraft, formatSize, limitText, listDraft, uploadDraft, type FileArea } from "./draftFiles";
import { isPlainDoc, plainDocJson, plainText } from "./mdEditor";
import { Box } from "./parts";

// 本文の見た目。AssignScreen の PROSE と同系統(入力欄の枠つき)
const EDITOR = "min-h-[18rem] rounded-[4px] border border-border bg-card p-3 text-[13.5px] [overflow-wrap:anywhere] [&_a]:text-primary [&_a]:underline [&_img]:h-auto [&_img]:max-w-full [&_p]:my-2 [&_ul]:pl-5 [&_ol]:pl-5 [&_ul]:list-disc [&_ol]:list-decimal [&_:is(h1,h2,h3,h4,h5,h6)]:my-2 [&_:is(h1,h2,h3,h4,h5,h6)]:font-bold [&_h1]:text-[1.5em] [&_h2]:text-[1.3em] [&_h3]:text-[1.15em] [&_blockquote]:border-l-2 [&_blockquote]:border-border [&_blockquote]:pl-3 [&_pre]:overflow-x-auto [&_code]:font-mono";
// 書式ボタン。[見出し, アイコン, コマンド, 引数, 押下中と見なす mark/node の名前]
const TOOLS: [string, Icon, { key: CmdKey<any> }, unknown?, string?][] = [
  ["太字", IconBold, toggleStrongCommand, undefined, "strong"],
  ["斜体", IconItalic, toggleEmphasisCommand, undefined, "emphasis"],
  ["コード", IconCode, toggleInlineCodeCommand, undefined, "inlineCode"],
  ["リンク", IconLink, toggleLinkCommand, undefined, "link"],
  ["見出し", IconH2, wrapInHeadingCommand, 2, "heading"],
  ["箇条書き", IconList, wrapInBulletListCommand, undefined, "bullet_list"],
  ["番号付きリスト", IconListNumbers, wrapInOrderedListCommand, undefined, "ordered_list"],
  ["引用", IconBlockquote, wrapInBlockquoteCommand, undefined, "blockquote"],
  ["コードブロック", IconSourceCode, createCodeBlockCommand, undefined, "code_block"],
  ["区切り線", IconSeparatorHorizontal, insertHrCommand],
  ["元に戻す", IconArrowBackUp, undoCommand],
  ["やり直す", IconArrowForwardUp, redoCommand],
];
const count = (s: string) => Array.from(s.replace(/\s/g, "")).length;

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
  // 書きかけは doc の JSON で `${id}-doc` に持つ(平文か Markdown かを読み戻しで変えないため)。古い版の書きかけは id に文字で
  const [draft] = useState((): { json: unknown } | { text: string; md: boolean } | null => {
    try { const j = load(`${page.id}-doc`); if (j !== null) return { json: JSON.parse(j) }; } catch { /* 壊れていたら古い方へ */ }
    const p = load(page.id);
    return p === null ? null : { text: p, md: (load(`${page.id}-md`) ?? (form.markdown ? "1" : "0")) === "1" }; // -md はチェックがあった版の印
  });
  const [chars, setChars] = useState(() => count(draft && "text" in draft ? draft.text : form.markdown ? form.text ?? "" : htmlToText(form.text ?? "")));
  const [busy, setBusy] = useState(false);
  const host = useRef<HTMLDivElement>(null);
  const editor = useRef<Editor | null>(null);
  const busyRef = useRef(false);
  // 最初の doc。listener は 200ms 遅れるので、編集したかは送る時にこれと比べる
  const initial = useRef<Node | null>(null);
  const ready = useRef(false); // 初期化の間の更新は書きかけに数えない
  const done = useRef(false); // 提出が通ったあとの pagehide・unmount で書きかけを戻さない
  busyRef.current = busy;
  // カーソル位置にかかっている mark と、囲んでいる node の名前(ボタンの押下表示用)
  const [active, setActive] = useState<Set<string>>(new Set());
  const [link, setLink] = useState<{ text: string; href: string } | null>(null); // リンクの小ウィンドウ。null で閉じている
  const refresh = () => editor.current?.action((ctx) => {
    const { storedMarks, selection: { $from } } = ctx.get(editorViewCtx).state;
    const names = new Set((storedMarks ?? $from.marks()).map((m) => m.type.name));
    for (let d = $from.depth; d > 0; d--) names.add($from.node(d).type.name);
    setActive(names);
  });

  useEffect(() => {
    if (!host.current) return;
    const original = form.markdown ? form.text ?? "" : htmlToText(form.text ?? "");
    // 元の本文に戻したら書きかけは消す(書きかけから始めたときは最初の doc も書きかけなので残す)
    const keep = (doc: Node) => {
      if (done.current) return;
      if (draft === null && doc.eq(initial.current!)) return save(`${page.id}-doc`, null);
      save(`${page.id}-doc`, JSON.stringify(doc.toJSON()));
      save(page.id, null);
    };
    const ed = Editor.make()
      .config((ctx) => {
        ctx.set(rootCtx, host.current);
        // 元が HTML なら Markdown として parse せず、段落と改行だけの doc にする
        if (draft && "json" in draft) ctx.set(defaultValueCtx, { type: "json", value: draft.json as Record<string, never> });
        else {
          const [init, md] = draft ? [draft.text, draft.md] : [original, form.markdown];
          ctx.set(defaultValueCtx, md ? init : { type: "json", value: plainDocJson(init) });
        }
        ctx.update(editorViewOptionsCtx, (o) => ({ ...o, editable: () => !busyRef.current, attributes: { "aria-label": "本文", class: EDITOR } }));
        ctx.get(listenerCtx).updated((_, doc) => { if (ready.current) { setChars(count(doc.textContent)); keep(doc); } });
      })
      .use(commonmark)
      .use(history)
      .use(listener);
    ed.create().then(() => {
      initial.current = ed.action((ctx) => ctx.get(editorViewCtx).state.doc);
      setChars(count(initial.current.textContent));
      editor.current = ed; ready.current = true;
    });
    // 200ms 以内に離れても書きかけを残す
    const flush = () => { if (ready.current && !done.current) keep(ed.action((ctx) => ctx.get(editorViewCtx).state.doc)); };
    addEventListener("pagehide", flush);
    return () => { removeEventListener("pagehide", flush); flush(); editor.current = null; ready.current = false; void ed.destroy(); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { editor.current?.action((ctx) => ctx.get(editorViewCtx).setProps({ editable: () => !busy })); }, [busy]);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState<StatusRow[] | null | "loading" | undefined>(undefined);
  const back = `/mod/assign/view.php?id=${page.id}`;

  const send = () => {
    if (form.text !== null && !editor.current) return; // エディタの準備前
    setBusy(true);
    setError(null);
    setStatus(undefined);
    // 未編集なら元の本文・書式のまま。記法を使っていなければ平文(HTML の段落)、使っていれば Markdown で送る
    const edited = editor.current?.action((ctx) => {
      const doc = ctx.get(editorViewCtx).state.doc;
      if (draft === null && doc.eq(initial.current!)) return null;
      // 送っている間に離れても書きかけが残るよう、今の doc を保存しておく(このあと done で flush は止まる)
      save(`${page.id}-doc`, JSON.stringify(doc.toJSON()));
      save(page.id, null);
      return isPlainDoc(doc) ? [plainText(doc), false] as const : [ctx.get(serializerCtx)(doc), true] as const;
    });
    const [body, md] = edited ?? [form.markdown ? form.text! : htmlToText(form.text ?? ""), form.markdown] as const;
    done.current = true;
    submit(form, body, md).then(() => { save(page.id, null); save(`${page.id}-doc`, null); save(`${page.id}-md`, null); }, (e: unknown) => {
      done.current = false;
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
                <div role="toolbar" aria-label="書式" className="relative flex flex-wrap gap-0.5">
                  {TOOLS.map(([label, I, cmd, arg, name]) => (
                    <button
                      key={label}
                      type="button"
                      title={label}
                      aria-label={label}
                      aria-pressed={name ? active.has(name) : undefined}
                      disabled={busy}
                      onMouseDown={(e) => e.preventDefault()} // 本文の選択を保つ
                      onClick={() => {
                        // リンクは外すとき以外 URL を聞く。toggleLink は文字を選んでいないと何もしない
                        if (cmd === toggleLinkCommand && !active.has("link")) return setLink(link === null ? { text: editor.current?.action((ctx) => { const { doc, selection: s } = ctx.get(editorViewCtx).state; return doc.textBetween(s.from, s.to, " "); }) ?? "", href: "" } : null);
                        editor.current?.action(callCommand(cmd.key, arg));
                        refresh();
                      }}
                      className="rounded-[4px] p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50 aria-pressed:bg-muted aria-pressed:text-foreground"
                    ><I size={16} /></button>
                  ))}
                {link !== null ? (
                  <form
                    role="dialog"
                    aria-label="リンクを付ける"
                    className="absolute left-0 top-full z-40 mt-1 flex w-[min(26rem,100%)] flex-col gap-2 rounded-[4px] border border-border bg-card p-3 shadow-md"
                    onKeyDown={(e) => e.key === "Escape" && setLink(null)}
                    onSubmit={(e) => {
                      e.preventDefault();
                      const href = link.href.trim();
                      const text = link.text || href;
                      if (!/^https?:\/\/\S/i.test(href)) return; // javascript: などは入れない
                      // 選んでいた範囲を、表示する文字にリンクを付けたものに置き換える(未選択ならカーソル位置に入れる)
                      editor.current?.action((ctx) => {
                        const view = ctx.get(editorViewCtx);
                        const { schema, tr, doc, selection: s } = view.state;
                        const mark = schema.marks.link!.create({ href });
                        // 文字を変えていなければ今の太字などを残したままリンクだけ足す
                        if (!s.empty && doc.textBetween(s.from, s.to, " ") === text) view.dispatch(tr.addMark(s.from, s.to, mark));
                        else view.dispatch(tr.replaceSelectionWith(schema.text(text, mark.addToSet(s.$from.marks())), false));
                        view.focus();
                      });
                      setLink(null);
                      refresh();
                    }}
                  >
                    {[["表示する文字", "text", "リンクの文字"], ["URL", "href", "https://"]].map(([label, key, ph]) => (
                      <label key={key} className="flex flex-col gap-1 text-[12px] text-muted-foreground">
                        {label}
                        <input
                          autoFocus={key === (link.text ? "href" : "text")}
                          type={key === "href" ? "url" : "text"}
                          placeholder={ph}
                          value={link[key as "text" | "href"]}
                          onChange={(e) => setLink({ ...link, [key!]: e.target.value })}
                          className="h-8 w-full rounded-[4px] border border-input bg-card px-2.5 py-1 text-sm text-foreground"
                        />
                      </label>
                    ))}
                    <div className="flex justify-end gap-2">
                      <button type="button" onClick={() => setLink(null)} className="h-8 rounded-[4px] px-3 text-sm text-muted-foreground hover:bg-muted">やめる</button>
                      <button type="submit" disabled={!/^https?:\/\/\S/i.test(link.href.trim())} className="h-8 rounded-[4px] bg-primary px-3 text-sm text-primary-foreground disabled:opacity-50">リンクにする</button>
                    </div>
                  </form>
                ) : null}
                </div>
                <div ref={host} onKeyUp={refresh} onMouseUp={refresh} />
                <span className="self-end text-[12px] text-muted-foreground">{`${chars} 字`}</span>
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
