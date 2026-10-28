import { useState } from "react";
import { ErrorNotice } from "@/ui/ErrorNotice";
import { PageLoading } from "@/ui/PageLoading";
import { loadForumList, loadPosts, type ForumList, type Post } from "./forum";
import { Box, Note } from "./parts";
import { useLoad } from "./useLoad";

const PROSE = "px-4 py-3 text-[13.5px] [overflow-wrap:anywhere] [&_a]:text-primary [&_a]:underline [&_img]:h-auto [&_img]:max-w-full [&_p]:my-2 [&_ul]:pl-5 [&_ol]:pl-5 [&_ul]:list-disc [&_ol]:list-decimal [&_:is(h1,h2,h3,h4,h5,h6)]:my-2 [&_:is(h1,h2,h3,h4,h5,h6)]:font-bold [&_blockquote]:border-l-2 [&_blockquote]:border-border [&_blockquote]:pl-3 [&_pre]:overflow-x-auto [&_code]:font-mono";

type Props = {
  /** 一覧のページなら読んだ一覧。本文のページでは null で、listUrl から取る */
  list: ForumList | null;
  listUrl: string | null;
  /** 最初に選ぶ投稿(本文のページ)。無ければ一覧の先頭 */
  d: number | null;
  /** 本文のページで読んだ投稿 */
  posts?: Post[];
  forumName: string;
  courseId: number | null;
  courseName: string;
};

/** フォーラム。左に件名の一覧、右に選んだ話題の投稿(返信・購読などは出さない) */
export function ForumScreen({ list: first, listUrl, d: firstD, posts: firstPosts, forumName, courseId, courseName }: Props) {
  const lst = useLoad(() => (listUrl ? loadForumList(listUrl) : Promise.resolve<ForumList>({ name: "", courseId: null, courseName: "", discussions: [] })), [listUrl], first ?? undefined);
  const list = lst.data;
  const [picked, setPicked] = useState<number | null>(null);
  const d = picked ?? firstD ?? list?.discussions[0]?.id ?? null;
  const ps = useLoad(() => (d === null ? Promise.resolve([] as Post[]) : loadPosts(d)), [d], firstPosts && d === firstD ? firstPosts : undefined);

  const head = (
    <div className="min-w-0">
      {courseName ? <p className="m-0 text-[12px] text-muted-foreground">{courseId ? <a className="text-primary hover:underline" href={`/course/view.php?id=${courseId}`}>{`‹ ${courseName}`}</a> : courseName}</p> : null}
      <h1 className="m-0 text-lg font-semibold [overflow-wrap:anywhere]">{forumName || list?.name || "フォーラム"}</h1>
    </div>
  );
  if (lst.failed && !list) return <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-4 p-4">{head}<ErrorNotice title="読み込めませんでした" message="話題の一覧を取得できませんでした。" onRetry={lst.reload} /></div>;
  const current = list?.discussions.find((x) => x.id === d);

  return (
    <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-4 p-4">
      {head}
      <div className="grid items-start gap-4 min-[800px]:grid-cols-[320px_minmax(0,1fr)]">
        <div className="min-w-0">
          <Box title="話題">
            {!list ? <PageLoading title="話題" /> : !list.discussions.length ? <Note>まだ投稿はありません</Note> : (
              <ul className="m-0 list-none p-0">
                {list.discussions.map((x) => (
                  <li key={x.id} className="border-b border-border last:border-b-0">
                    <button type="button" aria-current={x.id === d ? "true" : undefined} onClick={() => setPicked(x.id)} className={`flex w-full cursor-pointer flex-col gap-0.5 px-4 py-2 text-left hover:bg-muted ${x.id === d ? "bg-sidebar-accent text-sidebar-accent-foreground" : ""}`}>
                      <span className="text-[13px] font-semibold [overflow-wrap:anywhere]">{x.subject}</span>
                      <span className="text-[12px] text-muted-foreground">{[x.author, x.at, `返信 ${x.replies}`].filter(Boolean).join("、")}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Box>
        </div>
        <div className="min-w-0">
          <Box title={current?.subject ?? ps.data?.[0]?.subject ?? "投稿"}>
            {d === null ? <Note>まだ投稿はありません</Note>
              : ps.failed ? <div className="p-4"><ErrorNotice title="読み込めませんでした" message="投稿を取得できませんでした。" onRetry={ps.reload} /></div>
              : !ps.data ? <PageLoading title="投稿" />
              : !ps.data.length ? <Note>まだ投稿はありません</Note>
              : ps.data.map((p) => (
                <article key={p.id} className="border-b border-border last:border-b-0">
                  <header className="flex flex-wrap items-baseline gap-x-3 px-4 pt-3 text-[12px] text-muted-foreground">
                    <span className="font-semibold text-foreground">{p.author}</span>
                    <time>{p.at}</time>
                  </header>
                  <div className={PROSE} dangerouslySetInnerHTML={{ __html: p.html }} />
                </article>
              ))}
          </Box>
        </div>
      </div>
    </div>
  );
}
