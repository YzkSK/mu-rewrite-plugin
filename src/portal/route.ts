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

const SKIP = "mu-portal-skip:";
const skipped = (slug: string): boolean => {
  try { return sessionStorage.getItem(SKIP + slug) === "1"; } catch { return false; }
};

/** このページは元の画面で開く(セッションの間だけ)。印を付けて読み込み直す */
export function openOriginal(slug: string): void {
  try { sessionStorage.setItem(SKIP + slug, "1"); } catch { /* 付けられなければ読み直しても同じ画面になるだけ */ }
  location.reload();
}

/** 拡張が描く画面か(/dashboard 以下のページ全部。元の画面で開くと決めたページは除く) */
export const isAppPath = (l: { pathname: string; search: string }): boolean => isTargetPath(l.pathname) && !skipped(slugOf(l.pathname));

export type Route = "top" | "notices" | "page";
export const routeOf = (l: { pathname: string; search: string }): Route =>
  isNoticesPath(l.pathname, l.search) ? "notices" : isTopPath(l.pathname) ? "top" : "page";

export const NAV_EVENT = "mu-navigate";

/** アプリ内の移動。元のポータルの SPA は pushState を見ないので、こちらで知らせる(戻る操作は popstate) */
export function navigate(url: string): void {
  history.pushState(null, "", url);
  window.dispatchEvent(new Event(NAV_EVENT));
}
