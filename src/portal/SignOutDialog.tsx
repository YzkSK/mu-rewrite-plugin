import { useEffect, useState } from "react";
import { logout } from "./api";

/** サインアウトの確認。成功したら / へ移る(元のアプリがログイン画面を出す) */
export function SignOutDialog({ onClose }: { onClose: () => void }) {
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && !busy && onClose();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onClose, busy]);
  const go = () => {
    setBusy(true);
    setFailed(false);
    // 元と同じくサインインの画面へ。"/" へ戻すと SSO で自動的にサインインし直された(実機で確認)
    logout().then(() => location.assign("/login"), (e) => { console.error("[mu-portal]", e); setBusy(false); setFailed(true); });
  };
  const btn = "h-8 cursor-pointer rounded-[4px] border border-border bg-card px-3 text-[13px] hover:bg-muted disabled:cursor-default disabled:opacity-60";
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-[rgb(34_27_43/.35)] p-4" onMouseDown={(e) => e.target === e.currentTarget && !busy && onClose()}>
      <div role="dialog" aria-modal="true" aria-label="サインアウトの確認" className="flex w-full max-w-sm flex-col gap-4 rounded-[4px] border border-border bg-card p-4 text-card-foreground shadow-lg">
        <p className="m-0 text-sm">サインアウトしますか?</p>
        {failed ? <p role="alert" className="m-0 text-[13px] text-error">サインアウトできませんでした</p> : null}
        <div className="flex justify-end gap-2">
          <button type="button" className={btn} disabled={busy} onClick={onClose}>キャンセル</button>
          <button type="button" className={`${btn} text-error`} disabled={busy} onClick={go}>サインアウト</button>
        </div>
      </div>
    </div>
  );
}
