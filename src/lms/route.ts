export type Route = "home" | "course" | "assign" | "submit" | "courses" | "calendar" | "grades";

const GRADES = ["/grade/report/overview/index.php", "/grade/report/user/index.php"];

/** 描くのはホーム("/" と /index.php)・コース・課題・マイコース・カレンダー・成績。search(?redirect=0 など)は見ない */
export function isTargetPath(p: string): boolean {
  return p === "/" || p === "/index.php" || p === "/course/view.php" || p === "/mod/assign/view.php" || p === "/my/courses.php" || p === "/calendar/view.php" || GRADES.includes(p);
}

/** 課題は action なし=課題ページ、action=editsubmission=提出画面。ほかの action は null(元の画面) */
export function routeOf(p: string, search = ""): Route | null {
  if (p === "/course/view.php") return "course";
  if (p === "/my/courses.php") return "courses";
  if (p === "/calendar/view.php") return "calendar"; // view が month 以外でも month として描く
  if (GRADES.includes(p)) return "grades";
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

/** 拡張が描く画面か(対象のパスで、元の画面で開くと決めていないとき) */
export const isAppPath = (l: { pathname: string; search: string }): boolean => isTargetPath(l.pathname) && routeOf(l.pathname, l.search) !== null && !skipped(l);
