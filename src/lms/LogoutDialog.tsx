import { useEffect } from "react";
import { getSesskey } from "./api";
import { logoutHref, markLoggedOut } from "./login";

/** ログアウトの確認。OK で印を付けて、ページのログアウトのリンク(sesskey 付き)へ移る */
export function LogoutDialog({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onClose]);
  const go = () => {
    markLoggedOut();
    location.assign(logoutHref(document) ?? `/login/logout.php?sesskey=${encodeURIComponent(getSesskey())}`);
  };
  const btn = "h-8 cursor-pointer rounded-[4px] border border-border bg-card px-3 text-[13px] hover:bg-muted";
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-[rgb(34_27_43/.35)] p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" aria-label="ログアウトの確認" className="flex w-full max-w-sm flex-col gap-4 rounded-[4px] border border-border bg-card p-4 text-card-foreground shadow-lg">
        <p className="m-0 text-sm">ログアウトしますか?</p>
        <div className="flex justify-end gap-2">
          <button type="button" className={btn} onClick={onClose}>キャンセル</button>
          <button type="button" className={`${btn} text-error`} onClick={go}>ログアウト</button>
        </div>
      </div>
    </div>
  );
}
