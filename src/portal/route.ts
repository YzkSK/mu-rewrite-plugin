const PAGE = "/dashboard/page/";
export const TOP = "トップページ";

const decoded = (p: string): string | null => {
  try { return decodeURIComponent(p); } catch { return null; }
};

/** /dashboard と /dashboard/page/<slug> だけがこの拡張の対象 */
export function isTargetPath(p: string): boolean {
  const d = decoded(p);
  return d !== null && (d === "/dashboard" || d === "/dashboard/" || d.startsWith(PAGE));
}

/** 末尾の slug。/dashboard はトップページ */
export function slugOf(p: string): string {
  const d = decoded(p) ?? "";
  return d.startsWith(PAGE) ? d.slice(PAGE.length).split("/")[0] || TOP : TOP;
}

/** トップページか */
export const isTopPath = (p: string): boolean => isTargetPath(p) && slugOf(p) === TOP;

export const NOTICES = "お知らせ";
export const NOTICES_URL = PAGE + encodeURIComponent(NOTICES) + "?view=all";

/** お知らせ一覧(?view=all)か。これが無い /お知らせ は元のポータルに任せる */
export const isNoticesPath = (p: string, search = ""): boolean =>
  isTargetPath(p) && slugOf(p) === NOTICES && new URLSearchParams(search).get("view") === "all";

/** 拡張が描く画面(トップページ or お知らせ一覧)か。他のページは元のポータルに任せる */
export const isAppPath = (l: { pathname: string; search: string }): boolean => isTopPath(l.pathname) || isNoticesPath(l.pathname, l.search);

export type Route = "top" | "notices";
export const routeOf = (l: { pathname: string; search: string }): Route => (isNoticesPath(l.pathname, l.search) ? "notices" : "top");

export const NAV_EVENT = "mu-navigate";

/** アプリ内の移動。元のポータルの SPA は pushState を見ないので、こちらで知らせる(戻る操作は popstate) */
export function navigate(url: string): void {
  history.pushState(null, "", url);
  window.dispatchEvent(new Event(NAV_EVENT));
}
