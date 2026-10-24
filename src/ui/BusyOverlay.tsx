import type { ReactNode } from "react";
import { Spinner } from "@/components/starwind/spinner";

/** busy の間、前の内容を薄く残して丸いアイコンを重ねる(出入りはフェード) */
export function BusyOverlay({ busy, children }: { busy: boolean; children: ReactNode }) {
  return (
    <div className="relative" aria-busy={busy}>
      <div className={`transition-opacity duration-200 ${busy ? "pointer-events-none opacity-45" : ""}`}>{children}</div>
      <div aria-hidden="true" className={`pointer-events-none absolute inset-0 grid place-content-center transition-opacity duration-200 ${busy ? "opacity-100" : "opacity-0"}`}>
        <span className="rounded-full border border-border bg-background p-2 shadow-md"><Spinner className="size-5 text-primary" /></span>
      </div>
    </div>
  );
}
