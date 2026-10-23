import { useState } from "react";
import type { MuscatClient } from "@/muscat/api/client";
import { TimetableScreen } from "@/muscat/screens/timetable/TimetableScreen";
import { Drawer } from "@/ui/Drawer";
import { Header } from "@/ui/Header";

type Props = { client: MuscatClient; year: number; menuLabels: string[]; onNavigate: (label: string) => void };

/** ヘッダー + ドロワー + 時間割。ドロワーを開くと本文は横にずれる(flex)。 */
export function App({ client, year, menuLabels, onNavigate }: Props) {
  const [open, setOpen] = useState(false);
  const items = menuLabels.map((label) => ({ label, onSelect: () => onNavigate(label) }));
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header title="学生時間割表" onMenu={() => setOpen((o) => !o)} />
      <div className="flex">
        <Drawer open={open} items={items} onClose={() => setOpen(false)} />
        <main className="min-w-0 flex-1">
          <TimetableScreen client={client} year={year} />
        </main>
      </div>
    </div>
  );
}
