import { ErrorNotice } from "@/ui/ErrorNotice";
import { loadNav, type LtiPage, type Nav } from "./lti";
import { useLoad } from "./useLoad";

const LINK = "flex-none whitespace-nowrap text-[12.5px] text-primary hover:underline";

/** 動画などの教材(LTI)。上に戻る先と前後の教材、中央に元と同じ iframe */
export function LtiScreen({ page, nav: first }: { page: LtiPage; nav?: Nav | null }) {
  const nav = useLoad(() => (page.courseId && page.id ? loadNav(page.courseId, page.id) : Promise.resolve(null)), [page.courseId, page.id], first);
  if (page.id === null) return <div className="p-4"><ErrorNotice title="読み込めませんでした" message="教材を開けませんでした。" /></div>;
  const launch = `/mod/lti/launch.php?id=${page.id}&triggerview=0`;
  const n = nav.data;
  return (
    <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-3 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="m-0 text-[12px] text-muted-foreground">
            {page.courseId ? <a className="text-primary hover:underline" href={`/course/view.php?id=${page.courseId}`}>{`‹ ${[page.courseName || "コース", n?.section].filter(Boolean).join("、")}`}</a> : page.courseName}
          </p>
          <h1 className="m-0 text-lg font-semibold [overflow-wrap:anywhere]">{page.title}</h1>
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          {n?.prev ? <a className={LINK} href={n.prev.url} title={n.prev.name}>‹ 前の教材</a> : null}
          {n?.next ? <a className={LINK} href={n.next.url} title={n.next.name}>次の教材 ›</a> : null}
          <a className={LINK} href={launch} target="_blank" rel="noopener noreferrer">別の窓で開く</a>
        </div>
      </div>
      <iframe title={page.title || "教材"} src={launch} allow="microphone; camera; autoplay; encrypted-media; fullscreen" allowFullScreen className="block aspect-video max-h-[calc(100vh-10rem)] w-full border-0 bg-black" />
    </div>
  );
}
