import { ErrorNotice } from "@/ui/ErrorNotice";
import { loadNav, type LtiPage, type Nav } from "./lti";
import { NavLinks } from "./parts";
import { useLoad } from "./useLoad";

const LINK = "flex-none whitespace-nowrap text-[12.5px] text-primary hover:underline";

/** 動画などの教材(LTI)。上に戻る先と前後の教材、中央に元と同じ iframe */
export function LtiScreen({ page, nav: first }: { page: LtiPage; nav?: Nav | null }) {
  const nav = useLoad(() => (page.courseId && page.id ? loadNav(page.courseId, page.id) : Promise.resolve(null)), [page.courseId, page.id], first);
  if (page.id === null) return <div className="p-4"><ErrorNotice title="読み込めませんでした" message="教材を開けませんでした。" /></div>;
  const launch = `/mod/lti/launch.php?id=${page.id}&triggerview=0`;
  const n = nav.data;
  return (
    <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-3 p-4 max-[767px]:pb-20">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="m-0 text-[12px] text-muted-foreground">
            {page.courseId ? <a className="text-primary hover:underline" href={`/course/view.php?id=${page.courseId}`}>{`‹ ${[page.courseName || "コース", n?.section].filter(Boolean).join("、")}`}</a> : page.courseName}
          </p>
          <h1 className="m-0 text-lg font-semibold [overflow-wrap:anywhere]">{page.title}</h1>
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <NavLinks prev={n?.prev} next={n?.next} />
          <a className={`${LINK} max-[767px]:inline-flex max-[767px]:h-9 max-[767px]:items-center max-[767px]:rounded-[4px] max-[767px]:border max-[767px]:border-border max-[767px]:px-3`} href={launch} target="_blank" rel="noopener noreferrer">別の窓で開く</a>
        </div>
      </div>
      <iframe title={page.title || "教材"} src={launch} allow="microphone; camera; autoplay; encrypted-media; fullscreen" allowFullScreen className="block aspect-video max-h-[calc(100vh-10rem)] w-full border-0 bg-black max-[767px]:-mx-4 max-[767px]:w-[calc(100%+2rem)] max-[767px]:max-w-none" />
    </div>
  );
}
