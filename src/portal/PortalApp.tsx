import { App } from "@/muscat/shell/App";
import { fetchCalendar } from "./api";
import { TOP, type PortalData } from "./data";
import { PortalSidebar } from "./PortalSidebar";
import { TopPage } from "./screens/TopPage";

/** 枠(上の段 + サイドバー)にトップページを入れる。他のページは後続の PR で足す */
export function PortalApp({ data }: { data: PortalData }) {
  const cal = data.top.calendar;
  return (
    <App
      title={TOP}
      brand="MU Portal"
      headerRight={data.userName ? <span className="flex-none whitespace-nowrap text-[13px] font-semibold">{data.userName} さん</span> : null}
      sidebar={<PortalSidebar tree={data.tree} slug={TOP} />}
    >
      <TopPage data={data.top} loadMonth={(y, m) => fetchCalendar(cal?.sources ?? [], !!cal?.addOutLook, y, m)} />
    </App>
  );
}
