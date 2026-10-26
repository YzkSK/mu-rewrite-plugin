import { useState } from "react";
import { ErrorNotice } from "@/ui/ErrorNotice";
import { htmlToText, submit, type AssignPage, type SubmitForm } from "./assign";
import { AssignHead } from "./AssignScreen";
import { Box } from "./parts";
import { openOriginal } from "./route";

// 利用者ごとに分ける(同じタブで別の人がログインし直しても前の人の書きかけが出ない)
let user = "";
const key = (id: number | null) => `mu-lms-draft-${user}-${id}`;
const load = (id: number | null): string | null => { try { return sessionStorage.getItem(key(id)); } catch { return null; } };
const save = (id: number | null, v: string | null): void => {
  try { if (v === null) sessionStorage.removeItem(key(id)); else sessionStorage.setItem(key(id), v); } catch { /* 保存できなくても書ける */ }
};

export function SubmitScreen({ page, form }: { page: AssignPage; form: SubmitForm }) {
  user = form.fields.find(([k]) => k === "userid")?.[1] ?? "";
  const [text, setText] = useState(() => load(page.id) ?? htmlToText(form.text ?? ""));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const back = `/mod/assign/view.php?id=${page.id}`;

  const send = () => {
    setBusy(true);
    setError(null);
    submit(form, text).then(() => save(page.id, null), (e: unknown) => { setError(e instanceof Error ? e.message : String(e)); setBusy(false); });
  };

  return (
    <div className="mx-auto flex max-w-[1000px] flex-col gap-4 p-4">
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
                {/<(?!\/?(p|br)\b)[a-z]/i.test(form.text) ? <span className="text-[12px] text-error">今の本文には書式・リンク・画像があります。書き換えて提出すると外れます(書き換えなければそのまま)</span> : null}
              </div>
            )
            : null}
          {form.hasFiles
            ? (
              <div className="flex flex-wrap items-center gap-3 rounded-[4px] border border-border bg-card px-4 py-3">
                <p className="m-0 min-w-0 flex-1 text-[13px] text-muted-foreground">ファイルの提出は元の画面で行います</p>
                <button type="button" className="h-9 cursor-pointer rounded-[4px] border border-border bg-card px-4 text-[13.5px] hover:bg-muted" onClick={openOriginal}>元の画面で開く</button>
              </div>
            )
            : null}
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
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" disabled={busy} onClick={send} className="h-9 cursor-pointer rounded-[4px] bg-primary px-5 text-[13.5px] text-primary-foreground hover:opacity-90 disabled:cursor-default disabled:opacity-60">{busy ? "提出しています…" : "提出する"}</button>
        <a className="inline-flex h-9 items-center rounded-[4px] border border-border bg-card px-4 text-[13.5px] hover:bg-muted" href={back}>やめる</a>
        <span className="text-[12px] text-muted-foreground">押すと保存して提出します(確定が要る課題は、このあと課題の画面で「提出を確定する」)</span>
      </div>
    </div>
  );
}
