import {
  IconBell, IconBook, IconBuilding, IconChevronDown, IconExternalLink, IconHeart, IconHome, IconList, IconLogout,
  IconSearch, IconUser,
} from "@tabler/icons-react";
import { useState, type ComponentType } from "react";
import { Spinner } from "@/components/starwind/spinner";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/starwind/collapsible";
import {
  SidebarContent, SidebarFooter, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarMenuSub, SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/starwind/sidebar";
import type { NavGroup, NavItem, NavModel } from "@/muscat/shell/drawerItems";

type Props = { model: NavModel; onPick?: () => void; /** 移動中の項目のラベル */ pendingLabel?: string; onPending?: (label: string) => void };
type Pick = (i: NavItem) => void;

const GROUP_ICONS: Record<string, ComponentType<{ className?: string }>> = {
  お知らせ: IconBell, 授業: IconBook, シラバス: IconSearch, 学生支援: IconHeart, 設備状況照会: IconBuilding,
};
const FOOTER_ICONS: Record<string, ComponentType<{ className?: string }>> = {
  個人設定: IconUser, "MU ポータルへ": IconHome, "MU-LMS へ": IconBook, ログアウト: IconLogout,
};
// 押すと沈む・選択の地はフェードで移る
const MB = "transition-[background-color,color,transform,width,height,padding] duration-200 active:scale-[0.98]";

/** 移動中の項目の横の小さな丸いアイコン */
export const PendingSpinner = ({ on }: { on: boolean }) => (on ? <Spinner className="ml-auto size-4 text-primary" /> : null);

function Group({ group, pick, pendingLabel }: { group: NavGroup; pick: Pick; pendingLabel?: string }) {
  const Icon = GROUP_ICONS[group.title] ?? IconList;
  // 画面を移るたびに作り直されるので、最初は開く動きを出さない。自分で開閉したら動かす
  const [touched, setTouched] = useState(false);
  return (
    <SidebarMenuItem>
      <Collapsible defaultOpen className={touched ? undefined : "mu-still"} onOpenChange={() => setTouched(true)}>
        <CollapsibleTrigger asChild>
          <SidebarMenuButton size="md" className={`${MB} group/ghead h-[38px] cursor-pointer text-sm font-bold`}>
            <Icon className="text-primary" />
            <span>{group.title}</span>
            <IconChevronDown className="ml-auto size-4 -rotate-90 text-muted-foreground transition-transform duration-200 group-aria-expanded/ghead:rotate-0" />
          </SidebarMenuButton>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <SidebarMenuSub className="mx-0 mt-0.5 ml-5.5 gap-px">
            {group.items.map((item) => (
              <SidebarMenuSubItem key={item.label}>
                <SidebarMenuSubButton
                  href="#"
                  size="sm"
                  isActive={item.active}
                  aria-current={item.active ? "page" : undefined}
                  className={`${MB} h-[34px] cursor-pointer text-[13.5px] data-[active=true]:font-bold`}
                  onClick={(e) => {
                    e.preventDefault();
                    pick(item);
                  }}
                >
                  <span>{item.label}</span>
                  <PendingSpinner on={pendingLabel === item.label} />
                </SidebarMenuSubButton>
              </SidebarMenuSubItem>
            ))}
          </SidebarMenuSub>
        </CollapsibleContent>
      </Collapsible>
    </SidebarMenuItem>
  );
}

function FooterItem({ item, pick, pendingLabel }: { item: NavItem; pick: Pick; pendingLabel?: string }) {
  const Icon = FOOTER_ICONS[item.label] ?? IconList;
  const cls = `${MB} h-[34px] text-[13px] ${item.label === "ログアウト" ? "text-error hover:text-error" : "text-muted-foreground"}`;
  return (
    <SidebarMenuItem>
      {"href" in item ? (
        <SidebarMenuButton size="sm" href={item.href} target="_blank" rel="noopener noreferrer" className={cls}>
          <Icon />
          {item.label}
          <IconExternalLink className="ml-auto size-3.5!" />
        </SidebarMenuButton>
      ) : (
        <SidebarMenuButton size="sm" isActive={item.active} aria-current={item.active ? "page" : undefined} className={cls} onClick={() => pick(item)}>
          <Icon />
          {item.label}
          <PendingSpinner on={pendingLabel === item.label} />
        </SidebarMenuButton>
      )}
    </SidebarMenuItem>
  );
}

/** サイドバーの中身。開閉・幅・押し出しは App(Sidebar)の仕事。 */
export function AppSidebar({ model, onPick, pendingLabel, onPending }: Props) {
  const pick: Pick = (item) => {
    if ("onSelect" in item) {
      onPending?.(item.label);
      item.onSelect();
    }
    onPick?.();
  };
  const { home } = model;
  return (
    <>
      <SidebarContent className="gap-0.5 p-2.5">
        <SidebarMenu className="gap-0.5">
          <SidebarMenuItem>
            <SidebarMenuButton size="md" isActive={home.active} aria-current={home.active ? "page" : undefined} className={`${MB} h-[38px] text-sm`} onClick={() => pick(home)}>
              <IconHome className="text-primary" />
              {home.label}
              <PendingSpinner on={pendingLabel === home.label} />
            </SidebarMenuButton>
          </SidebarMenuItem>
          {model.groups.map((g) => (
            <Group key={g.title} group={g} pick={pick} pendingLabel={pendingLabel} />
          ))}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter className="gap-px border-t border-sidebar-border px-2.5 pt-2 pb-3">
        <SidebarMenu className="gap-px">
          {model.footer.map((i) => (
            <FooterItem key={i.label} item={i} pick={pick} pendingLabel={pendingLabel} />
          ))}
        </SidebarMenu>
      </SidebarFooter>
    </>
  );
}
