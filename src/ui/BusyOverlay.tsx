import type { ReactNode } from "react";
import { Spin } from "./Spin";

/** busy の間、中身に薄い灰色を重ね、その真ん中に大きめの丸いアイコンを出す(出入りはフェード) */
// className は外枠に付ける。付けたときは中身を外枠の高さいっぱいにする
export function BusyOverlay({ busy, className, children }: { busy: boolean; className?: string; children: ReactNode }) {
  return (
    <div className={`relative ${className ?? ""}`} aria-busy={busy}>
      <div inert={busy} className={`${className ? "h-full" : ""} ${busy ? "pointer-events-none" : ""}`}>{children}</div>
      {/* 枠の真ん中に出す(画面の真ん中だと、枠の位置とずれて見えた) */}
      <div aria-hidden="true" className={`pointer-events-none absolute inset-0 grid place-items-center bg-[rgb(243_242_245/.6)] transition-opacity duration-200 ${busy ? "opacity-100" : "opacity-0"}`}>
        <Spin className="size-8" />
      </div>
    </div>
  );
}
