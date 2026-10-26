import { useCallback, useState } from "react";
import { App } from "@/muscat/shell/App";
import { EmptyState } from "@/ui/EmptyState";
import { LmsSidebar } from "./LmsSidebar";
import { LogoutDialog } from "./LogoutDialog";

/** 枠(上の段 + サイドバー)にホームを入れる。上の段だけ LMS の色 */
export function LmsApp({ userName }: { userName: string | null }) {
  const [logout, setLogout] = useState(false);
  const closeLogout = useCallback(() => setLogout(false), []);
  return (
    <>
    {/* 小窓を開いている間は後ろを操作させない(Tab で後ろに抜けない) */}
    <div inert={logout} className="contents">
    <App
      title="ホーム"
      brand="MU LMS"
      barClassName="bg-[#26212E] text-white"
      headerRight={userName ? <span className="flex-none whitespace-nowrap text-[13px] font-semibold">{userName} さん</span> : null}
      sidebar={(onPick) => <LmsSidebar onPick={onPick} onLogout={() => setLogout(true)} />}
    >
      <EmptyState title="提出期限・コースはまもなくここに出ます" />
    </App>
    </div>
    {logout ? <LogoutDialog onClose={closeLogout} /> : null}
    </>
  );
}
