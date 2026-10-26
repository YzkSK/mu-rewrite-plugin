import type { ReactNode } from "react";

/** 見出しの文字(小さい太字)と、その下の入力欄 */
export function Field({ label, required, children }: { label: string; required?: boolean; children: ReactNode }) {
  return (
    <div className="grid min-w-0 gap-1">
      <span className="text-xs font-bold text-muted-foreground">
        {label}
        {required && <span className="ml-1 text-[11px] font-medium text-error">必須</span>}
      </span>
      {children}
    </div>
  );
}
