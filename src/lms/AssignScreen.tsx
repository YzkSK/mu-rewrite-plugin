import type { ReactNode } from "react";
import type { AssignPage } from "./assign";
import { Box, Note, Row } from "./parts";
import { openOriginal } from "./route";

const PROSE = "px-4 py-3 text-[13.5px] [overflow-wrap:anywhere] [&_a]:text-primary [&_a]:underline [&_img]:h-auto [&_img]:max-w-full [&_p]:my-2 [&_ul]:pl-5 [&_ol]:pl-5 [&_ul]:list-disc [&_ol]:list-decimal [&_:is(h1,h2,h3,h4,h5,h6)]:my-2 [&_:is(h1,h2,h3,h4,h5,h6)]:font-bold [&_blockquote]:border-l-2 [&_blockquote]:border-border [&_blockquote]:pl-3 [&_pre]:overflow-x-auto [&_code]:font-mono";
const SHOWN = new Set(["提出ステータス", "評定ステータス", "残り時間", "オンラインテキスト", "ファイル提出"]);

/** 上の「‹ コース名」と題名。右に元の画面で開く */
export function AssignHead({ page, title }: { page: AssignPage; title: string }) {
  return (
    <div className="flex w-full items-start justify-between gap-3">
      <div className="min-w-0">
        {page.courseName
          ? (page.courseId !== null
            ? <a className="text-[12.5px] text-primary hover:underline" href={`/course/view.php?id=${page.courseId}`}>{`‹ ${page.courseName}`}</a>
            : <span className="text-[12px] text-muted-foreground">{page.courseName}</span>)
          : null}
        <h1 className="m-0 text-lg font-semibold [overflow-wrap:anywhere]">{title}</h1>
      </div>
      <button type="button" className="flex-none whitespace-nowrap text-[12.5px] text-primary hover:underline" onClick={openOriginal}>元の LMS で開く</button>
    </div>
  );
}

const Cell = ({ label, children }: { label: string; children: ReactNode }) => (
  <div className="min-w-0 flex-1 basis-[180px] px-4 py-3">
    <p className="m-0 text-[12px] text-muted-foreground">{label}</p>
    <p className="m-0 mt-0.5 text-[13.5px] [overflow-wrap:anywhere]">{children}</p>
  </div>
);

export function AssignScreen({ page }: { page: AssignPage }) {
  const get = (l: string) => page.rows.find((r) => r.label === l);
  const due = page.dates.find((d) => d.label === "期限") ?? page.dates.find((d) => d.label === "終了") ?? page.dates.at(-1);
  const left = get("残り時間");
  const status = get("提出ステータス");
  const submitted = !!status?.cls.includes("submissionstatussubmitted");
  const mine = ["オンラインテキスト", "ファイル提出"].map(get).filter((r) => r && r.text);
  const more = page.rows.filter((r) => !SHOWN.has(r.label));

  return (
    <div className="mx-auto flex w-full max-w-[900px] flex-col gap-4 p-4">
      <AssignHead page={page} title={page.title} />
      <div className="overflow-hidden rounded-[4px] border border-border bg-card text-card-foreground">
        <div className="flex flex-wrap divide-x divide-border">
          <Cell label="期限">
            {due ? due.value : "-"}
            {left?.text ? <span className={`block text-[12px] ${/overdue|late/.test(left.cls) ? "font-bold text-error" : "text-muted-foreground"}`}>{left.text}</span> : null}
          </Cell>
          <Cell label="提出">{status?.text || "-"}</Cell>
          <Cell label="評定">{get("評定ステータス")?.text || "-"}</Cell>
        </div>
        {(page.canSubmit || page.needsFinal) && page.id !== null
          ? (
            <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border bg-muted px-4 py-2.5">
              {/* 「提出ボタンを押させる」設定の課題は、保存しただけでは下書き。確定は元の画面の確認(提出の誓約など)に任せる */}
              {page.needsFinal ? (
                <>
                  <span className="text-[12.5px] text-error">まだ下書きです。確定しないと提出になりません</span>
                  <a className="inline-flex h-9 items-center rounded-[4px] bg-primary px-4 text-[13.5px] text-primary-foreground hover:opacity-90" href={`/mod/assign/view.php?id=${page.id}&action=submit`}>提出を確定する</a>
                </>
              ) : null}
              {page.canSubmit ? <a className="inline-flex h-9 items-center rounded-[4px] bg-primary px-4 text-[13.5px] text-primary-foreground hover:opacity-90" href={`/mod/assign/view.php?id=${page.id}&action=editsubmission`}>{submitted ? "提出を直す" : "提出する"}</a> : null}
            </div>
          )
          : null}
      </div>
      {page.description ? <Box title="説明"><div className={PROSE} dangerouslySetInnerHTML={{ __html: page.description }} /></Box> : null}
      <Box title="提出したもの">
        {mine.length
          ? mine.map((r) => <div key={r!.label} className={`${PROSE} border-b border-border last:border-b-0`} dangerouslySetInnerHTML={{ __html: r!.html }} />)
          : <Note>まだ提出されていません</Note>}
      </Box>
      {more.length
        ? (
          <Box title="詳しい状態">
            <ul className="m-0 list-none p-0">
              {more.map((r) => (
                <Row key={r.label}>
                  <span className="w-[10rem] flex-none text-[12.5px] text-muted-foreground">{r.label}</span>
                  <span className="min-w-0 flex-1 text-[12.5px] [overflow-wrap:anywhere]">{r.text}</span>
                </Row>
              ))}
            </ul>
          </Box>
        )
        : null}
    </div>
  );
}
