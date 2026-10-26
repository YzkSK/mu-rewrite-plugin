import { useState } from "react";
import { courseName } from "@/portal/lib/lms";
import { ErrorNotice } from "@/ui/ErrorNotice";
import { PageLoading } from "@/ui/PageLoading";
import { Box, Note, Row } from "./parts";
import { loadSearch, type SearchResult } from "./search";
import { useLoad } from "./useLoad";

const LINK = "text-foreground hover:underline";

function Results({ q, initial }: { q: string; initial?: SearchResult }) {
  const r = useLoad(() => loadSearch(q), [q], initial);
  if (r.failed) return <ErrorNotice title="読み込めませんでした" message="検索できませんでした。" onRetry={r.reload} />;
  if (!r.data) return <PageLoading title="検索" />;
  const { courses, items, others } = r.data;
  return (
    <>
      <Box title={`自分のコース(${courses.length + items.length} 件)`}>
        {!courses.length && !items.length ? <Note>見つかりませんでした</Note> : (
          <ul className="m-0 list-none p-0">
            {courses.map((c) => <Row key={`c${c.id}`}><a className={`min-w-0 flex-1 text-[13.5px] [overflow-wrap:anywhere] ${LINK}`} href={c.url}>{courseName(c.name)}</a><span className="h-fit flex-none text-[12px] text-muted-foreground">コース</span></Row>)}
            {items.map((i) => (
              <Row key={i.id}>
                <span className="min-w-0 flex-1 text-[13.5px] [overflow-wrap:anywhere]">
                  {i.url ? <a className={LINK} href={i.url}>{i.name}</a> : i.name}
                  <span className="block text-[12px] text-muted-foreground">{i.courseName}</span>
                </span>
                <span className="h-fit flex-none text-[12px] text-muted-foreground">教材</span>
              </Row>
            ))}
          </ul>
        )}
      </Box>
      <Box title={`ほかのコース(${others.length} 件)`}>
        {!others.length ? <Note>見つかりませんでした</Note> : (
          <ul className="m-0 list-none p-0">
            {others.map((c) => (
              <Row key={c.id}>
                <span className="min-w-0 flex-1 text-[13.5px] [overflow-wrap:anywhere]">
                  <a className={LINK} href={`/course/view.php?id=${c.id}`}>{c.name}</a>
                  {c.teachers ? <span className="block text-[12px] text-muted-foreground">{c.teachers}</span> : null}
                </span>
              </Row>
            ))}
          </ul>
        )}
      </Box>
    </>
  );
}

/** 検索。この画面の上の欄で Enter を押すと、URL の search を書き換えて画面の中で読み直す */
export function SearchScreen({ search, initial }: { search: string; initial?: SearchResult }) {
  const first = (new URLSearchParams(search).get("search") ?? "").trim();
  const [q, setQ] = useState(first);
  const [text, setText] = useState(first);
  const go = (e: React.FormEvent) => {
    e.preventDefault();
    const v = text.trim();
    setQ(v);
    try { history.replaceState(null, "", `/course/search.php?search=${encodeURIComponent(v)}`); } catch { /* 書き換えられなくても画面は動く */ }
  };
  return (
    <div className="mx-auto flex w-full max-w-[800px] flex-col gap-4 p-4">
      <form onSubmit={go} role="search">
        <input type="search" aria-label="検索語" placeholder="コース・教材を探す" value={text} onChange={(e) => setText(e.target.value)} className="h-10 w-full rounded-[4px] border border-border bg-card px-3 text-[14px]" />
      </form>
      {q ? <Results key={q} q={q} initial={q === first ? initial : undefined} /> : <Box title="検索"><Note>検索語を入れて Enter を押してください</Note></Box>}
    </div>
  );
}
