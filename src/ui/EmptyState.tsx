import type { ReactNode } from "react";

type Props = { title: string; hint?: string; action?: ReactNode };

export function EmptyState({ title, hint, action }: Props) {
  return (
    <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
      <p className="m-0 text-[15px] font-semibold">{title}</p>
      {hint ? <p className="m-0 text-[13px] text-muted-foreground">{hint}</p> : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}
