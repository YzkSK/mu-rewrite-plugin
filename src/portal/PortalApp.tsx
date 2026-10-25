import { useEffect, useState, useSyncExternalStore } from "react";
import { App } from "@/muscat/shell/App";
import { ErrorNotice } from "@/ui/ErrorNotice";
import { PageLoading } from "@/ui/PageLoading";
import { fetchCalendar } from "./api";
import { loadTop, TOP, type PortalData, type TopData } from "./data";
import { PortalSidebar } from "./PortalSidebar";
import { NAV_EVENT, NOTICES, routeOf, slugOf } from "./route";
import { NoticesScreen } from "./screens/NoticesScreen";
import { PageScreen, usePage } from "./screens/PageScreen";
import { TopPage } from "./screens/TopPage";

const subscribe = (cb: () => void) => {
  window.addEventListener("popstate", cb);
  window.addEventListener(NAV_EVENT, cb);
  return () => { window.removeEventListener("popstate", cb); window.removeEventListener(NAV_EVENT, cb); };
};
const here = () => location.pathname + location.search;

/** 開始が一覧のときトップのデータは無い。トップへ移ったとき取る(取れたものは data.ts が覚える) */
function Top({ initial }: { initial: TopData | null }) {
  const [top, setTop] = useState(initial);
  const [failed, setFailed] = useState(false);
  const [tries, setTries] = useState(0);
  useEffect(() => {
    if (top) return;
    setFailed(false);
    loadTop().then(setTop).catch((e) => { console.error("[mu-portal]", e); setFailed(true); });
  }, [top, tries]);
  if (failed) return <div className="p-4"><ErrorNotice title="トップページを読み込めませんでした" message="" onRetry={() => setTries(tries + 1)} /></div>;
  if (!top) return <PageLoading title={TOP} />;
  const cal = top.calendar;
  return <TopPage data={top} loadMonth={(y, m) => fetchCalendar(cal?.sources ?? [], !!cal?.addOutLook, y, m)} />;
}

/** 枠(上の段 + サイドバー)にトップページ・お知らせ一覧・通常のページを入れる */
export function PortalApp({ data }: { data: PortalData }) {
  const url = useSyncExternalStore(subscribe, here, () => "");
  const u = new URL(url, location.origin);
  const route = routeOf(u);
  const slug = route === "page" ? slugOf(u.pathname) : route === "notices" ? NOTICES : TOP;
  const page = usePage(route === "page" ? slug : null);
  const title = "page" in page ? page.page.title : slug;
  return (
    <App
      title={title}
      brand="MU Portal"
      headerRight={data.shell.userName ? <span className="flex-none whitespace-nowrap text-[13px] font-semibold">{data.shell.userName} さん</span> : null}
      sidebar={(onPick) => <PortalSidebar tree={data.shell.tree} slug={slug} onPick={onPick} />}
    >
      {route === "notices" ? <NoticesScreen key={u.search} initialCategory={u.searchParams.get("category") ?? ""} />
        : route === "page" ? <PageScreen key={slug} slug={slug} state={page} />
        : <Top initial={data.top} />}
    </App>
  );
}
