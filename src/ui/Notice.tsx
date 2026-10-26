import type { ReactNode } from "react";
import { Card } from "./Card";

/** お知らせ・メッセージ用の枠 */
export function Notice({ children }: { children: ReactNode }) {
  return (
    <Card className="p-3 text-sm" >
      <p role="status">{children}</p>
    </Card>
  );
}
