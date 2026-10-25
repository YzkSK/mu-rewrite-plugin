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

/** いま描く対象(トップページ)か。他のページは元のポータルに任せる */
export const isTopPath = (p: string): boolean => isTargetPath(p) && slugOf(p) === TOP;
