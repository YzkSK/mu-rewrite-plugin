import { useCallback, useState } from "react";
import { App } from "@/muscat/shell/App";
import { courseName } from "@/portal/lib/lms";
import type { AssignPage, SubmitForm } from "./assign";
import { AssignScreen } from "./AssignScreen";
import type { CoursePage } from "./course";
import { CourseScreen } from "./CourseScreen";
import { SubmitScreen } from "./SubmitScreen";
import { HomeScreen } from "./HomeScreen";
import { LmsSidebar } from "./LmsSidebar";
import { LogoutDialog } from "./LogoutDialog";

/** ホーム以外の画面と、entry が今のページから読んだもの */
export type View =
  | { kind: "course"; page: CoursePage }
  | { kind: "assign"; page: AssignPage }
  | { kind: "submit"; page: AssignPage; form: SubmitForm };

const titleOf = (v: View | null): string =>
  !v ? "ホーム" : v.kind === "course" ? courseName(v.page.name) || "コース" : v.kind === "assign" ? v.page.title || "課題" : `${v.page.title || "課題"}を提出`;

/** 枠(上の段 + サイドバー)にホーム/コース/課題を入れる。上の段だけ LMS の色。view が無ければホーム */
export function LmsApp({ userName, userId, view }: { userName: string | null; userId: number | null; view: View | null }) {
  const [logout, setLogout] = useState(false);
  const closeLogout = useCallback(() => setLogout(false), []);
  return (
    <>
    {/* 小窓を開いている間は後ろを操作させない(Tab で後ろに抜けない) */}
    <div inert={logout} className="contents">
    <App
      title={titleOf(view)}
      brand="MU LMS"
      barClassName="bg-[#26212E] text-white"
      headerRight={userName ? <span className="flex-none whitespace-nowrap text-[13px] font-semibold">{userName} さん</span> : null}
      sidebar={(onPick) => <LmsSidebar home={!view} onPick={onPick} onLogout={() => setLogout(true)} />}
    >
      {!view ? <HomeScreen userId={userId} /> : view.kind === "course" ? <CourseScreen page={view.page} /> : view.kind === "assign" ? <AssignScreen page={view.page} /> : <SubmitScreen page={view.page} form={view.form} />}
    </App>
    </div>
    {logout ? <LogoutDialog onClose={closeLogout} /> : null}
    </>
  );
}
