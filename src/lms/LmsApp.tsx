import { useCallback, useState } from "react";
import { App } from "@/muscat/shell/App";
import { courseName } from "@/portal/lib/lms";
import type { AssignPage, SubmitForm } from "./assign";
import { AssignScreen } from "./AssignScreen";
import type { CoursePage } from "./course";
import { CourseScreen } from "./CourseScreen";
import { SubmitScreen } from "./SubmitScreen";
import { CalendarScreen } from "./CalendarScreen";
import { CoursesScreen } from "./CoursesScreen";
import { GradesScreen } from "./GradesScreen";
import type { GradeCourse } from "./grades";
import { HomeScreen } from "./HomeScreen";
import { LmsSidebar, type Active } from "./LmsSidebar";
import { LogoutDialog } from "./LogoutDialog";

/** ホーム以外の画面と、entry が今のページから読んだもの */
export type View =
  | { kind: "course"; page: CoursePage }
  | { kind: "assign"; page: AssignPage }
  | { kind: "submit"; page: AssignPage; form: SubmitForm }
  | { kind: "courses" }
  | { kind: "calendar"; search: string }
  /** list は成績の一覧のページで開いたときだけ(コースの評定のページでは null で、画面が取りに行く)。id は選ぶコース */
  | { kind: "grades"; list: GradeCourse[] | null; id: number | null };

const titleOf = (v: View | null): string =>
  !v ? "ホーム"
    : v.kind === "course" ? courseName(v.page.name) || "コース"
    : v.kind === "assign" ? v.page.title || "課題"
    : v.kind === "submit" ? `${v.page.title || "課題"}を提出`
    : v.kind === "courses" ? "マイコース"
    : v.kind === "calendar" ? "カレンダー"
    : "成績";

/** サイドバーで強調する項目 */
const activeOf = (v: View | null): Active => (!v ? "home" : v.kind === "courses" || v.kind === "calendar" || v.kind === "grades" ? v.kind : null);

function Screen({ view, userId }: { view: View | null; userId: number | null }) {
  if (!view) return <HomeScreen userId={userId} />;
  switch (view.kind) {
    case "course": return <CourseScreen page={view.page} />;
    case "assign": return <AssignScreen page={view.page} />;
    case "submit": return <SubmitScreen page={view.page} form={view.form} />;
    case "courses": return <CoursesScreen />;
    case "calendar": return <CalendarScreen search={view.search} />;
    case "grades": return <GradesScreen list={view.list} id={view.id} />;
  }
}

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
      sidebar={(onPick) => <LmsSidebar active={activeOf(view)} onPick={onPick} onLogout={() => setLogout(true)} />}
    >
      <Screen view={view} userId={userId} />
    </App>
    </div>
    {logout ? <LogoutDialog onClose={closeLogout} /> : null}
    </>
  );
}
