import { SidebarContent, SidebarFooter, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "@/components/starwind/sidebar";
import { ACTIVE, MB } from "@/ui/AppSidebar";
import { openOriginal } from "./route";

export type Active = "home" | "courses" | "calendar" | "grades" | "messages" | null;

const ITEMS: { title: string; href: string; key?: Active }[] = [
  { title: "マイコース", href: "/my/courses.php", key: "courses" },
  { title: "カレンダー", href: "/calendar/view.php?view=month", key: "calendar" },
  { title: "成績", href: "/grade/report/overview/index.php", key: "grades" },
  { title: "メッセージ", href: "/message/index.php", key: "messages" },
];
const FOOT = `${MB} h-8 rounded-none px-5 text-[13px] text-muted-foreground`;
const ROW = `${MB} ${ACTIVE} h-10 rounded-none px-5 text-sm`;

/** 左の一覧。どれも普通のリンク(全画面の遷移)で、今の画面の項目だけ強調する。開閉・幅・押し出しは App(Sidebar)の仕事。 */
export function LmsSidebar({ active, onPick, onLogout }: { active: Active; onPick?: () => void; onLogout: () => void }) {
  const home = active === "home";
  return (
    <>
      <SidebarContent className="gap-0 p-0">
        <SidebarMenu className="gap-0">
          <SidebarMenuItem>
            <SidebarMenuButton size="md" href="/" isActive={home} aria-current={home ? "page" : undefined} className={`${ROW} font-semibold`}>ホーム</SidebarMenuButton>
          </SidebarMenuItem>
          {ITEMS.map((i) => (
            <SidebarMenuItem key={i.href}>
              <SidebarMenuButton size="md" href={i.href} isActive={!!i.key && i.key === active} aria-current={i.key && i.key === active ? "page" : undefined} className={ROW}>{i.title}</SidebarMenuButton>
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
            <SidebarMenuButton size="sm" href="/user/profile.php" className={FOOT}>プロファイル・設定</SidebarMenuButton>
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
