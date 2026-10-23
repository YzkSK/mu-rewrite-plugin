import type { ReactNode } from "react";
import StarwindCard from "@/components/starwind/card/Card";

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <StarwindCard className={className}>{children}</StarwindCard>;
}
