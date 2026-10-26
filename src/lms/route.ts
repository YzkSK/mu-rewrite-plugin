export type Route = "home" | "course";

/** 描くのはホーム("/" と /index.php)とコース。search(?redirect=0 など)は見ない */
export function isTargetPath(p: string): boolean {
  return p === "/" || p === "/index.php" || p === "/course/view.php";
}

export const routeOf = (p: string): Route => (p === "/course/view.php" ? "course" : "home");

const SKIP = "mu-lms-skip";
const skipped = (): boolean => {
  try { return sessionStorage.getItem(SKIP) === "1"; } catch { return false; }
};

/** 元の LMS で開く(セッションの間だけ)。印を付けて読み込み直す */
export function openOriginal(): void {
  try { sessionStorage.setItem(SKIP, "1"); } catch { /* 付けられなければ読み直しても同じ画面になるだけ */ }
  location.reload();
}

/** 拡張が描く画面か(対象のパスで、元の画面で開くと決めていないとき) */
export const isAppPath = (l: { pathname: string; search: string }): boolean => isTargetPath(l.pathname) && !skipped();
