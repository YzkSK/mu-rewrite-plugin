import type { ReactNode } from "react";
import StarwindCard from "@/components/starwind/card/Card";

// 角は 4px、枠は 1px(ring)、影は付けない。className で上書きできる
export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <StarwindCard className={`rounded-[4px] shadow-none ring-border ${className ?? ""}`}>{children}</StarwindCard>;
}
