import {
  IconBell, IconBook, IconBuilding, IconChevronDown, IconExternalLink, IconHeart, IconHome, IconList, IconLogout,
  IconSearch, IconUser,
} from "@tabler/icons-react";
import type { ComponentType } from "react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/starwind/collapsible";
import {
  SidebarContent, SidebarFooter, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarMenuSub, SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/starwind/sidebar";
import type { NavGroup, NavItem, NavModel } from "@/muscat/shell/drawerItems";

type Props = { model: NavModel; onPick?: () => void };

const GROUP_ICONS: Record<string, ComponentType<{ className?: string }>> = {
  お知らせ: IconBell, 授業: IconBook, シラバス: IconSearch, 学生支援: IconHeart, 設備状況照会: IconBuilding,
};
const FOOTER_ICONS: Record<string, ComponentType<{ className?: string }>> = {
  個人設定: IconUser, "MU ポータルへ": IconHome, "MU-LMS へ": IconBook, ログアウト: IconLogout,
};
// 押すと沈む・選択の地はフェードで移る
const MB = "transition-[background-color,color,transform,width,height,padding] duration-200 active:scale-[0.98]";

function Group({ group, pick }: { group: NavGroup; pick: (i: NavItem) => void }) {
  const Icon = GROUP_ICONS[group.title] ?? IconList;
  return (
    <SidebarMenuItem>
      <Collapsible defaultOpen>
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
                </SidebarMenuSubButton>
              </SidebarMenuSubItem>
            ))}
          </SidebarMenuSub>
        </CollapsibleContent>
      </Collapsible>
    </SidebarMenuItem>
  );
}

function FooterItem({ item, pick }: { item: NavItem; pick: (i: NavItem) => void }) {
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
        </SidebarMenuButton>
      )}
    </SidebarMenuItem>
  );
}

/** サイドバーの中身。開閉・幅・押し出しは App(Sidebar)の仕事。 */
export function AppSidebar({ model, onPick }: Props) {
  const pick = (item: NavItem) => {
    if ("onSelect" in item) item.onSelect();
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
            </SidebarMenuButton>
          </SidebarMenuItem>
          {model.groups.map((g) => (
            <Group key={g.title} group={g} pick={pick} />
          ))}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter className="gap-px border-t border-sidebar-border px-2.5 pt-2 pb-3">
        <SidebarMenu className="gap-px">
          {model.footer.map((i) => (
            <FooterItem key={i.label} item={i} pick={pick} />
          ))}
        </SidebarMenu>
      </SidebarFooter>
    </>
  );
}
