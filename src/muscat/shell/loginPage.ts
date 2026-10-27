/** 拡張でログアウトした印(sessionStorage)。あれば /uprx/ から SSO へ飛ばさない */
export const LOGGED_OUT_KEY = "mu-m-logged-out";
// reenter.ts と同じキー・同じ見張り
const SSO_KEY = "mu-m-sso";
const GUARD_MS = 30_000;

/** パスワードのログイン画面か */
export function isLoginPage(doc: Document): boolean {
  return !!doc.querySelector('#loginForm input[type="password"]');
}

/** "sso": SSO へ飛ばす(時刻を残す)。"notice": 飛ばさず拡張の画面を出す(ログアウト直後・30 秒以内の戻り・storage が使えない) */
export function loginPageAction({ storage, now }: { storage: Pick<Storage, "getItem" | "setItem">; now: number }): "sso" | "notice" {
  try {
    if (storage.getItem(LOGGED_OUT_KEY)) return "notice";
    if (now - (Number(storage.getItem(SSO_KEY)) || 0) < GUARD_MS) return "notice";
    storage.setItem(SSO_KEY, String(now));
    return "sso";
  } catch {
    return "notice"; // 繰り返しを防げないので飛ばさない
  }
}

/** ログイン画面の「シラバスはこちらから閲覧可能です」のリンク先(絶対 URL)。無ければ "" */
export function publicSyllabusHref(doc: Document): string {
  const a = [...doc.querySelectorAll("a")].find((x) => x.textContent?.includes("シラバスはこちらから閲覧可能です"));
  return a?.href ?? "";
}
