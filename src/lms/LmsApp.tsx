import { useCallback, useEffect, useState } from "react";
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
import { ForumScreen } from "./ForumScreen";
import type { DiscussionPage, ForumList } from "./forum";
import { LtiScreen } from "./LtiScreen";
import type { LtiPage } from "./lti";
import { MessagesScreen } from "./MessagesScreen";
import { QuestionnaireScreen } from "./QuestionnaireScreen";
import type { QuestionnairePage } from "./questionnaire";
import { ProfileScreen } from "./ProfileScreen";
import type { ProfilePage } from "./profile";
import { SearchScreen } from "./SearchScreen";
import { LogoutDialog } from "./LogoutDialog";

/** ホーム以外の画面と、entry が今のページから読んだもの */
export type View =
  | { kind: "course"; page: CoursePage }
  | { kind: "assign"; page: AssignPage }
  | { kind: "submit"; page: AssignPage; form: SubmitForm }
  | { kind: "courses" }
  | { kind: "calendar"; search: string }
  /** list は成績の一覧のページで開いたときだけ(コースの評定のページでは null で、画面が取りに行く)。id は選ぶコース */
  | { kind: "grades"; list: GradeCourse[] | null; id: number | null }
  | { kind: "forum"; list: ForumList }
  | { kind: "discussion"; page: DiscussionPage }
  | { kind: "messages"; path: string; search: string }
  | { kind: "lti"; page: LtiPage }
  | { kind: "questionnaire"; page: QuestionnairePage }
  | { kind: "search"; search: string }
  | { kind: "profile"; page: ProfilePage };

export const titleOf = (v: View | null): string =>
  !v ? "ホーム"
    : v.kind === "course" ? courseName(v.page.name) || "コース"
    : v.kind === "assign" ? v.page.title || "課題"
    : v.kind === "submit" ? `${v.page.title || "課題"}を提出`
    : v.kind === "courses" ? "マイコース"
    : v.kind === "calendar" ? "カレンダー"
    : v.kind === "forum" ? v.list.name || "フォーラム"
    : v.kind === "discussion" ? v.page.posts[0]?.subject || v.page.forumName || "フォーラム"
    : v.kind === "messages" ? "メッセージ"
    : v.kind === "lti" ? v.page.title || "教材"
    : v.kind === "questionnaire" ? v.page.title || "アンケート"
    : v.kind === "search" ? "検索"
    : v.kind === "profile" ? v.page.name || "プロファイル"
    : "成績";

/** サイドバーで強調する項目 */
const activeOf = (v: View | null): Active => (!v ? "home" : v.kind === "courses" || v.kind === "calendar" || v.kind === "grades" || v.kind === "messages" ? v.kind : null);

function Screen({ view, userId }: { view: View | null; userId: number | null }) {
  if (!view) return <HomeScreen userId={userId} />;
  switch (view.kind) {
    case "course": return <CourseScreen page={view.page} />;
    case "assign": return <AssignScreen page={view.page} />;
    case "submit": return <SubmitScreen page={view.page} form={view.form} />;
    case "courses": return <CoursesScreen />;
    case "calendar": return <CalendarScreen search={view.search} />;
    case "grades": return <GradesScreen list={view.list} id={view.id} />;
    case "forum": return <ForumScreen list={view.list} listUrl={null} d={null} forumName={view.list.name} courseId={view.list.courseId} courseName={view.list.courseName} />;
    case "discussion": return <ForumScreen list={null} listUrl={view.page.forumUrl} d={view.page.d} posts={view.page.posts} forumName={view.page.forumName} courseId={view.page.courseId} courseName={view.page.courseName} />;
    case "messages": return <MessagesScreen path={view.path} search={view.search} userId={userId} />;
    case "lti": return <LtiScreen page={view.page} />;
    case "questionnaire": return <QuestionnaireScreen page={view.page} />;
    case "search": return <SearchScreen search={view.search} />;
    case "profile": return <ProfileScreen page={view.page} />;
  }
}

/** 枠(上の段 + サイドバー)にホーム/コース/課題を入れる。上の段だけ LMS の色。view が無ければホーム */
export function LmsApp({ userName: namePromise, userId, view }: { userName: Promise<string | null>; userId: number | null; view: View | null }) {
  const [userName, setUserName] = useState<string | null>(null);
  useEffect(() => { void namePromise.then(setUserName); }, [namePromise]);
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
