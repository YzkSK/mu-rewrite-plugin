import type { ReactNode } from "react";
import Badge from "@/components/starwind/badge/Badge";

type Props = { children: ReactNode; tone?: "default" | "alert" };

export function Chip({ children, tone = "default" }: Props) {
  // mu-chip--alert はテストと呼び出し側から色の種類を判別するための目印。
  return (
    <Badge variant={tone === "alert" ? "error" : "secondary"} className={tone === "alert" ? "mu-chip--alert" : undefined}>
      {children}
    </Badge>
  );
}
