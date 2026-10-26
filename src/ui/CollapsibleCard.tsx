import type { ReactNode } from "react";
import { Card } from "./Card";

type Props = { title: string; open: boolean; onToggle: () => void; children: ReactNode };

export function CollapsibleCard({ title, open, onToggle, children }: Props) {
  return (
    <Card className="p-4">
      <button type="button" aria-expanded={open} onClick={onToggle} className="flex w-full cursor-pointer items-center justify-between text-left text-sm font-bold">
        {title}
        <span aria-hidden="true">{open ? "−" : "+"}</span>
      </button>
      {open && <div className="mt-2">{children}</div>}
    </Card>
  );
}
