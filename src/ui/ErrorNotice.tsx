import { Button } from "./Button";
import { NativeLink } from "./NativeLink";

type Props = { title: string; message: string; onRetry?: () => void };

export function ErrorNotice({ title, message, onRetry }: Props) {
  return (
    <div role="alert" className="flex flex-col gap-2 rounded-[4px] border border-[#e7b9b5] bg-[#fbefee] p-4">
      <p className="m-0 text-sm font-semibold text-[#8c1d17]">{title}</p>
      <p className="m-0 text-[13px] text-foreground">{message}</p>
      {onRetry ? (
        <div>
          <Button variant="secondary" onClick={onRetry}>もう一度読み込む</Button>
        </div>
      ) : null}
      <NativeLink />
    </div>
  );
}
