import { useState, type ReactNode } from "react";
import { Drawer, type DrawerItem } from "@/ui/Drawer";
import { Header } from "@/ui/Header";

type Props = { title: string; items: DrawerItem[]; user?: string; children: ReactNode };

/** ヘッダー + ドロワー + 画面。ドロワーを開くと本文は横にずれる(flex)。 */
export function App({ title, items, user, children }: Props) {
  const [open, setOpen] = useState(false);
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header title={title} user={user} onMenu={() => setOpen((o) => !o)} />
      <div className="flex">
        <Drawer open={open} items={items} onClose={() => setOpen(false)} />
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
