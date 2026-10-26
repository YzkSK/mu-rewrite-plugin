import { IconMenu2 } from "@tabler/icons-react";
import type { ReactNode } from "react";
import { SidebarTrigger } from "@/components/starwind/sidebar";

type Props = { title: string; user?: string; lastLogin?: string; brand?: string; right?: ReactNode; barClassName?: string };

/** 上の段(全幅)。☰ は SidebarProvider の中で開閉を担う唯一のボタン。right を渡すとユーザー欄の代わりに置く。barClassName で地の色を替える(LMS 用)。 */
export function Header({ title, user, lastLogin, brand = "MUSCAT", right, barClassName = "bg-primary text-primary-foreground" }: Props) {
  return (
    <div className={`relative z-30 flex h-(--bar-h) flex-none items-center gap-3 px-4 ${barClassName}`}>
      <SidebarTrigger variant="ghost" size="icon" aria-label="メニューを開閉" icon={<IconMenu2 />} className="size-9 rounded-[4px] border border-white/40 bg-transparent text-white hover:bg-white/10 hover:text-white" />
      <span className="text-[17px] font-bold tracking-[.06em]">{brand}</span>
      <span className="h-6 w-px flex-none bg-white/35" />
      <h1 className="m-0 min-w-0 flex-1 text-[15px] font-medium [overflow-wrap:anywhere]">{title}</h1>
      {right ??
        (user ? (
        <div className="flex flex-none flex-col items-end whitespace-nowrap leading-tight">
          <span className="text-[13px] font-semibold">{user} さん</span>
          {lastLogin ? <span className="text-[11px] text-white/75 group-data-[narrow=true]/frame:hidden">前回ログイン {lastLogin}</span> : null}
        </div>
      ) : null)}
    </div>
  );
}
