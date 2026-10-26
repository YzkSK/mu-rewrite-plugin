const LOGOUT = 'a[href*="/login/logout.php"]';
const OUT = "mu-lms-loggedout";
const TRIED = "mu-lms-tried";
const TRIED_MS = 60_000;

export const LOGIN_URL = "/login/index.php";

/** ログイン中のページにはユーザーメニューにログアウトのリンクがある(ゲスト用トップには無い) */
export const isLoggedIn = (doc: Document): boolean => doc.querySelector(LOGOUT) !== null;

/** ページに埋まっている設定(元の script は止めてあるが DOM には残っている)から読む */
const fromScripts = (doc: Document, re: RegExp): string | null => {
  for (const s of doc.querySelectorAll("script:not([src])")) {
    const m = re.exec(s.textContent ?? "");
    if (m) return m[1]!;
  }
  return null;
};
export const readSesskey = (doc: Document): string | null => fromScripts(doc, /"sesskey":"([^"]+)"/);
export const readUserId = (doc: Document): number | null => {
  const id = fromScripts(doc, /"userId":(\d+)/);
  return id === null ? null : Number(id);
};

/** ページのログアウトのリンク(sesskey 付き)の href */
export const logoutHref = (doc: Document): string | null => doc.querySelector(LOGOUT)?.getAttribute("href") ?? null;

const get = (k: string): number | null => {
  try { const v = sessionStorage.getItem(k); return v === null ? null : Number(v); } catch { return null; }
};
const set = (k: string, v: number) => {
  try { sessionStorage.setItem(k, String(v)); } catch { /* 付けられなければ印なしで進む */ }
};
const del = (k: string) => {
  try { sessionStorage.removeItem(k); } catch { /* 消せなければそのまま */ }
};

export const markLoggedOut = (): void => set(OUT, Date.now());
export const peekLoggedOut = (): number | null => get(OUT);
export const clearLoggedOut = (): void => del(OUT);
export const markTried = (): void => set(TRIED, Date.now());
export const peekTried = (): number | null => get(TRIED);
export const clearTried = (): void => del(TRIED);

/** どの LMS ページでも、ログアウトのリンクが押されたら印を付ける(元の画面のユーザーメニューから出た場合も拾う) */
export function watchLogout(doc: Document): void {
  doc.addEventListener("click", (e) => {
    if (e.target instanceof Element && e.target.closest(LOGOUT)) markLoggedOut();
  }, true);
}

export type Decision = "app" | "login" | "loggedout" | "failed";

/** ログイン中なら描く。未ログインは、ログアウト直後なら案内、SSO から戻っても未ログインなら失敗、それ以外はログインへ */
export function decide(o: { loggedIn: boolean; loggedOutAt: number | null; triedAt: number | null; now: number }): Decision {
  if (o.loggedIn) return "app";
  if (o.loggedOutAt !== null) return "loggedout";
  if (o.triedAt !== null && o.now - o.triedAt <= TRIED_MS) return "failed";
  return "login";
}
