export type Route = "home" | "course" | "assign" | "submit" | "courses" | "calendar" | "grades" | "forum" | "discussion" | "messages" | "lti" | "questionnaire" | "search" | "profile";

const GRADES = ["/grade/report/overview/index.php", "/grade/report/user/index.php"];
const MESSAGES = ["/message/index.php", "/message/output/popup/notifications.php"];
const OTHERS: Record<string, Route> = { "/mod/forum/view.php": "forum", "/mod/forum/discuss.php": "discussion", "/mod/lti/view.php": "lti", "/mod/questionnaire/view.php": "questionnaire", "/course/search.php": "search", "/user/profile.php": "profile" };

/** 描くのはホーム("/" と /index.php)・コース・課題・マイコース・カレンダー・成績・フォーラム・メッセージ・教材(動画)・検索・プロファイル。search(?redirect=0 など)は見ない */
export function isTargetPath(p: string): boolean {
  return p === "/" || p === "/index.php" || p === "/course/view.php" || p === "/mod/assign/view.php" || p === "/my/courses.php" || p === "/calendar/view.php" || GRADES.includes(p) || MESSAGES.includes(p) || p in OTHERS;
}

/** 課題は action なし=課題ページ、action=editsubmission=提出画面。ほかの action は null(元の画面) */
export function routeOf(p: string, search = ""): Route | null {
  if (p === "/course/view.php") return "course";
  if (p === "/my/courses.php") return "courses";
  if (p === "/calendar/view.php") return "calendar"; // view が month 以外でも month として描く
  if (GRADES.includes(p)) return "grades";
  if (MESSAGES.includes(p)) return "messages";
  if (p in OTHERS) return OTHERS[p]!;
  if (p === "/mod/assign/view.php") {
    const a = new URLSearchParams(search).get("action");
    return a === null ? "assign" : a === "editsubmission" ? "submit" : null;
  }
  return "home";
}

// 印はそのページ(パス+search)だけ。タブ全体に付けると、ほかのページまで元の画面のままになる
const SKIP = "mu-lms-skip:";
const skipped = (l: { pathname: string; search: string }): boolean => {
  try { return sessionStorage.getItem(SKIP + l.pathname + l.search) === "1"; } catch { return false; }
};

/** このページを元の LMS で開く(セッションの間だけ)。印を付けて読み込み直す */
export function openOriginal(): void {
  try { sessionStorage.setItem(SKIP + location.pathname + location.search, "1"); } catch { /* 付けられなければ読み直しても同じ画面になるだけ */ }
  location.reload();
}

/** このページの「元の LMS で開く」印を消して読み込み直す(拡張の画面に戻る) */
export function closeOriginal(): void {
  try { sessionStorage.removeItem(SKIP + location.pathname + location.search); } catch { /* 消せなければ読み直しても同じ画面になるだけ */ }
  location.reload();
}

/** 元の画面で開くと決めた対象ページか */
export const isSkipped = (l: { pathname: string; search: string }): boolean => isTargetPath(l.pathname) && routeOf(l.pathname, l.search) !== null && skipped(l);

/** 拡張が描く画面か(対象のパスで、元の画面で開くと決めていないとき) */
export const isAppPath = (l: { pathname: string; search: string }): boolean => isTargetPath(l.pathname) && routeOf(l.pathname, l.search) !== null && !skipped(l);
