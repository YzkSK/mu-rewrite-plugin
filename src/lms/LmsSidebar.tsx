import { SidebarContent, SidebarFooter, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "@/components/starwind/sidebar";
import { ACTIVE, MB } from "@/ui/AppSidebar";
import { openOriginal } from "./route";

const ITEMS = [
  { title: "マイコース", href: "/my/courses.php" },
  { title: "カレンダー", href: "/calendar/view.php?view=month" },
  { title: "成績", href: "/grade/report/overview/index.php" },
  { title: "メッセージ", href: "/message/index.php" },
];
const FOOT = `${MB} h-8 rounded-none px-5 text-[13px] text-muted-foreground`;
const ROW = `${MB} ${ACTIVE} h-10 rounded-none px-5 text-sm`;

/** 左の一覧。ホーム以外は今は元の画面への普通のリンク(全画面の遷移)。開閉・幅・押し出しは App(Sidebar)の仕事。 */
export function LmsSidebar({ home, onPick, onLogout }: { home: boolean; onPick?: () => void; onLogout: () => void }) {
  return (
    <>
      <SidebarContent className="gap-0 p-0">
        <SidebarMenu className="gap-0">
          <SidebarMenuItem>
            <SidebarMenuButton size="md" href="/" isActive={home} aria-current={home ? "page" : undefined} className={`${ROW} font-semibold`}>ホーム</SidebarMenuButton>
          </SidebarMenuItem>
          {ITEMS.map((i) => (
            <SidebarMenuItem key={i.href}>
              <SidebarMenuButton size="md" href={i.href} className={ROW}>{i.title}</SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter className="gap-0 border-t border-sidebar-border p-0 py-1">
        <SidebarMenu className="gap-0">
          <SidebarMenuItem>
            <SidebarMenuButton size="sm" href="https://portal.musashino-u.ac.jp/dashboard" target="_blank" rel="noopener noreferrer" className={FOOT}>
              MU ポータル
              <span className="ml-auto text-[11px] text-muted-foreground">外部</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton size="sm" href="https://unipa.m-muscat.musashino-u.ac.jp/uprx/ShibbolethAuthServlet" target="_blank" rel="noopener noreferrer" className={FOOT}>
              MUSCAT
              <span className="ml-auto text-[11px] text-muted-foreground">外部</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton size="sm" className={FOOT} onClick={openOriginal}>元の LMS で開く</SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton size="sm" className={FOOT.replace("text-muted-foreground", "text-error hover:text-error")} onClick={() => { onLogout(); onPick?.(); }}>ログアウト</SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </>
  );
}
