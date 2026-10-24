import { IconChevronDown } from "@tabler/icons-react";
import { useState } from "react";
import { flushSync } from "react-dom";
import { Spinner } from "@/components/starwind/spinner";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/starwind/collapsible";
import {
  SidebarContent, SidebarFooter, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarMenuSub, SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/starwind/sidebar";
import type { NavGroup, NavItem, NavModel } from "@/muscat/shell/drawerItems";

type Props = { model: NavModel; onPick?: () => void; /** 移動中の項目のラベル */ pendingLabel?: string; onPending?: (label: string) => void };
type Pick = (i: NavItem) => void;

// 押すと沈む・選択の地はフェードで移る
const MB = "transition-[background-color,color,transform,width,height,padding] duration-200 active:scale-[0.98]";
// 選択中: 薄い紫の地・紫の文字・左に 3px の線(どの項目も同じ)
const ACTIVE = "data-[active=true]:bg-sidebar-accent data-[active=true]:font-semibold data-[active=true]:text-sidebar-accent-foreground data-[active=true]:shadow-[inset_3px_0_0_var(--mu-primary)]";

/** 移動中の項目の横の小さな丸いアイコン */
export const PendingSpinner = ({ on }: { on: boolean }) => (on ? <Spinner className="ml-auto size-4 text-primary" /> : null);

function Group({ group, pick, pendingLabel }: { group: NavGroup; pick: Pick; pendingLabel?: string }) {
  // 画面を移るたびに作り直されるので、最初は開く動きを出さない。自分で開閉したら動かす
  const [touched, setTouched] = useState(false);
  return (
    <SidebarMenuItem className="border-t border-sidebar-border">
      <Collapsible defaultOpen className={touched ? undefined : "mu-still"}>
        <CollapsibleTrigger asChild>
          {/* 見出しの click(開閉が確定)で、開閉より先に印を DOM から外す。後だと最初の 1 回が動かず、項目や押し下げで外すと開いたままの所に開く動きが出る */}
          <SidebarMenuButton
            onClickCapture={() => flushSync(() => setTouched(true))}
            size="sm" className={`${MB} group/ghead h-9 cursor-pointer rounded-none px-5 text-xs font-semibold text-muted-foreground`}>
            <span>{group.title}</span>
            <IconChevronDown className="ml-auto size-4 -rotate-90 text-muted-foreground transition-transform duration-200 group-aria-expanded/ghead:rotate-0" />
          </SidebarMenuButton>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <SidebarMenuSub className="m-0 translate-x-0 gap-0 border-l-0 p-0">
            {group.items.map((item) => (
              <SidebarMenuSubItem key={item.label}>
                <SidebarMenuSubButton
                  href="#"
                  size="sm"
                  isActive={item.active}
                  aria-current={item.active ? "page" : undefined}
                  className={`${MB} ${ACTIVE} h-8 translate-x-0 cursor-pointer rounded-none px-5 text-[13.5px]`}
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
  const cls = `${MB} ${ACTIVE} h-8 rounded-none px-5 text-[13px] ${item.label === "ログアウト" ? "text-error hover:text-error" : "text-muted-foreground"}`;
  return (
    <SidebarMenuItem>
      {"href" in item ? (
        <SidebarMenuButton size="sm" href={item.href} target="_blank" rel="noopener noreferrer" className={cls}>
          {item.label}
          <span className="ml-auto text-[11px] text-muted-foreground">外部</span>
        </SidebarMenuButton>
      ) : (
        <SidebarMenuButton size="sm" isActive={item.active} aria-current={item.active ? "page" : undefined} className={cls} onClick={() => pick(item)}>
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
      <SidebarContent className="gap-0 p-0">
        <SidebarMenu className="gap-0">
          <SidebarMenuItem>
            <SidebarMenuButton size="md" isActive={home.active} aria-current={home.active ? "page" : undefined} className={`${MB} ${ACTIVE} h-10 rounded-none px-5 text-sm font-semibold`} onClick={() => pick(home)}>
              {home.label}
              <PendingSpinner on={pendingLabel === home.label} />
            </SidebarMenuButton>
          </SidebarMenuItem>
          {model.groups.map((g) => (
            <Group key={g.title} group={g} pick={pick} pendingLabel={pendingLabel} />
          ))}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter className="gap-0 border-t border-sidebar-border p-0 py-1">
        <SidebarMenu className="gap-0">
          {model.footer.map((i) => (
            <FooterItem key={i.label} item={i} pick={pick} pendingLabel={pendingLabel} />
          ))}
        </SidebarMenu>
      </SidebarFooter>
    </>
  );
}
