import type { ReactNode } from "react";
import { Spin } from "./Spin";

/** busy の間、中身に薄い灰色を重ね、その真ん中に大きめの丸いアイコンを出す(出入りはフェード) */
export function BusyOverlay({ busy, children }: { busy: boolean; children: ReactNode }) {
  return (
    <div className="relative" aria-busy={busy}>
      <div inert={busy} className={busy ? "pointer-events-none" : ""}>{children}</div>
      {/* 枠の真ん中に出す(画面の真ん中だと、枠の位置とずれて見えた) */}
      <div aria-hidden="true" className={`pointer-events-none absolute inset-0 grid place-items-center bg-[rgb(243_242_245/.6)] transition-opacity duration-200 ${busy ? "opacity-100" : "opacity-0"}`}>
        <Spin className="size-8" />
      </div>
    </div>
  );
}
