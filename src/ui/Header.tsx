import { IconMenu2 } from "@tabler/icons-react";
import { SidebarTrigger } from "@/components/starwind/sidebar";

type Props = { title: string; user?: string };

/** 上の段(全幅)。☰ は SidebarProvider の中で開閉を担う唯一のボタン。 */
export function Header({ title, user }: Props) {
  return (
    <div className="relative z-30 flex h-(--bar-h) flex-none items-center gap-3 border-b border-border bg-background px-4">
      <SidebarTrigger variant="primary" size="icon" aria-label="メニューを開閉" icon={<IconMenu2 />} className="size-11 rounded-full" />
      <span className="text-xl font-extrabold tracking-[.04em] text-primary">MUSCAT</span>
      <span className="h-6 w-px flex-none bg-border group-data-[narrow=true]/frame:hidden" />
      <h1 className="m-0 min-w-0 flex-1 text-base font-bold [overflow-wrap:anywhere]">{title}</h1>
      {user ? (
        <span className="whitespace-nowrap rounded-full bg-secondary px-3 py-1 text-xs text-secondary-foreground group-data-[narrow=true]/frame:hidden">{user}</span>
      ) : null}
    </div>
  );
}
