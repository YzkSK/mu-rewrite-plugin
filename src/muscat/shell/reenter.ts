const KEY = "mu-m-sso";
const GUARD_MS = 30_000;

export type ReenterDeps = {
  loggedIn: boolean;
  pathname: string;
  storage: Pick<Storage, "getItem" | "setItem">;
  now: number;
  reportBounce(): Promise<void>;
  replace(url: string): void;
};

/** メニューの無い Bsa00101(ログイン画面の 200 や空の応答)で、30 秒以内に入り直していなければ true */
export function shouldReenter({ loggedIn, pathname, storage, now }: Pick<ReenterDeps, "loggedIn" | "pathname" | "storage" | "now">): boolean {
  if (loggedIn || !pathname.endsWith("/Bsa00101.xhtml")) return false;
  try {
    return now - (Number(storage.getItem(KEY)) || 0) >= GUARD_MS;
  } catch {
    return false; // sessionStorage が使えなければ繰り返しを防げないので入り直さない
  }
}

/** 入口(SSO)から入り直す。入り直したら true(その間は覆いを保つ) */
export async function reenter(d: ReenterDeps): Promise<boolean> {
  if (!shouldReenter(d)) return false;
  try {
    d.storage.setItem(KEY, String(d.now));
  } catch {
    return false;
  }
  await d.reportBounce();
  d.replace("/uprx/ShibbolethAuthServlet");
  return true;
}
