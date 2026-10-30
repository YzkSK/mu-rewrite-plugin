import { ErrorNotice } from "@/ui/ErrorNotice";
import { loadNav, type Nav } from "./lti";
import type { QuestionnairePage } from "./questionnaire";
import { useLoad } from "./useLoad";
import { BTN, Cell, PROSE } from "./AssignScreen";
import { Box, NavLinks } from "./parts";

/** アンケートの表示ページ。回答フォームは元の画面(ボタンの先) */
export function QuestionnaireScreen({ page, nav: first }: { page: QuestionnairePage; nav?: Nav | null }) {
  const nav = useLoad(() => (page.courseId && page.id ? loadNav(page.courseId, page.id) : Promise.resolve(null)), [page.courseId, page.id], first);
  if (page.id === null) return <div className="p-4"><ErrorNotice title="読み込めませんでした" message="アンケートを開けませんでした。" /></div>;
  const n = nav.data;
  const start = page.dates.find((d) => d.label.includes("開始"));
  const end = page.dates.find((d) => d.label.includes("終了"));
  // 試行回数が無く締切済みのときだけ、3枠目に「終了しました」を出す(その文は下の注記から外す)
  const showClosed = page.attempts === null && page.closed;
  const notes = showClosed ? page.messages.filter((m) => !m.includes("終了しました")) : page.messages;
  return (
    <div className="mx-auto flex w-full max-w-[900px] flex-col gap-4 p-4 max-[767px]:pb-20">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="m-0 text-[12px] text-muted-foreground">
            {page.courseId ? <a className="text-primary hover:underline" href={`/course/view.php?id=${page.courseId}`}>{`‹ ${[page.courseName || "コース", n?.section].filter(Boolean).join("、")}`}</a> : page.courseName}
          </p>
          <h1 className="m-0 text-lg font-semibold [overflow-wrap:anywhere]">{page.title}</h1>
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <NavLinks prev={n?.prev} next={n?.next} />
        </div>
      </div>
      <div className="overflow-hidden rounded-[4px] border border-border bg-card text-card-foreground">
        <div className="flex flex-wrap divide-x divide-border max-[767px]:flex-col max-[767px]:divide-x-0 max-[767px]:divide-y">
          <Cell label="期間">
            {end ? `${end.value} まで` : "-"}
            {start ? <span className="block text-[12px] text-muted-foreground">{`開始 ${start.value}`}</span> : null}
          </Cell>
          <Cell label="回答">{page.answered ? "回答済み" : "未回答"}</Cell>
          {page.attempts !== null ? <Cell label="回答できる回数">{`${page.attempts} 回`}</Cell> : showClosed ? <Cell label="状態">終了しました</Cell> : null}
        </div>
        {page.actions.length
          ? (
            <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border bg-muted px-4 py-2.5 max-[767px]:flex-col max-[767px]:items-stretch">
              {page.actions.map((a) => <a key={a.url} className={BTN} href={a.url}>{a.url.includes("complete.php") ? "回答する" : a.url.includes("myreport.php") ? "自分の回答を見る" : a.label}</a>)}
            </div>
          )
          : null}
      </div>
      {notes.map((m, i) => <p key={i} className="m-0 text-[12.5px] text-muted-foreground [overflow-wrap:anywhere]">{m}</p>)}
      {page.intro ? <Box title="説明"><div className={PROSE} dangerouslySetInnerHTML={{ __html: page.intro }} /></Box> : null}
    </div>
  );
}
