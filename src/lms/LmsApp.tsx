import { useCallback, useState } from "react";
import { App } from "@/muscat/shell/App";
import { courseName } from "@/portal/lib/lms";
import type { CoursePage } from "./course";
import { CourseScreen } from "./CourseScreen";
import { HomeScreen } from "./HomeScreen";
import { LmsSidebar } from "./LmsSidebar";
import { LogoutDialog } from "./LogoutDialog";

/** 枠(上の段 + サイドバー)にホーム/コースを入れる。上の段だけ LMS の色。course があればコース画面 */
export function LmsApp({ userName, userId, course }: { userName: string | null; userId: number | null; course: CoursePage | null }) {
  const [logout, setLogout] = useState(false);
  const closeLogout = useCallback(() => setLogout(false), []);
  return (
    <>
    {/* 小窓を開いている間は後ろを操作させない(Tab で後ろに抜けない) */}
    <div inert={logout} className="contents">
    <App
      title={course ? courseName(course.name) || "コース" : "ホーム"}
      brand="MU LMS"
      barClassName="bg-[#26212E] text-white"
      headerRight={userName ? <span className="flex-none whitespace-nowrap text-[13px] font-semibold">{userName} さん</span> : null}
      sidebar={(onPick) => <LmsSidebar home={!course} onPick={onPick} onLogout={() => setLogout(true)} />}
    >
      {course ? <CourseScreen page={course} /> : <HomeScreen userId={userId} />}
    </App>
    </div>
    {logout ? <LogoutDialog onClose={closeLogout} /> : null}
    </>
  );
}
