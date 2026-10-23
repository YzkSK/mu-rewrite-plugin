import { useState, type ReactNode } from "react";
import { Drawer } from "@/ui/Drawer";
import { Header } from "@/ui/Header";

type Props = { title: string; menuLabels: string[]; onNavigate: (label: string) => void; children: ReactNode };

/** ヘッダー + ドロワー + 画面。ドロワーを開くと本文は横にずれる(flex)。 */
export function App({ title, menuLabels, onNavigate, children }: Props) {
  const [open, setOpen] = useState(false);
  const items = menuLabels.map((label) => ({ label, onSelect: () => onNavigate(label) }));
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header title={title} onMenu={() => setOpen((o) => !o)} />
      <div className="flex">
        <Drawer open={open} items={items} onClose={() => setOpen(false)} />
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
