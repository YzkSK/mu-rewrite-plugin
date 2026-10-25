import type { ReactNode } from "react";
import { Spin } from "./Spin";

/** busy の間、前の内容を薄く残して丸いアイコンを重ねる(出入りはフェード) */
export function BusyOverlay({ busy, children }: { busy: boolean; children: ReactNode }) {
  return (
    <div className="relative" aria-busy={busy}>
      <div inert={busy} className={`transition-opacity duration-200 ${busy ? "pointer-events-none opacity-45" : ""}`}>{children}</div>
      <div aria-hidden="true" className={`pointer-events-none absolute inset-0 flex justify-center transition-opacity duration-200 ${busy ? "opacity-100" : "opacity-0"}`}>
        {/* 中身が短くても長くても、画面の縦の真ん中に出す(fixed で left を決めないと、横は親の真ん中のまま) */}
        <span className="fixed top-1/2 -translate-y-1/2 rounded-full border border-border bg-background p-2 shadow-md"><Spin className="size-5" /></span>
      </div>
    </div>
  );
}
