import { MuscatDownError, SsoRequiredError } from "./errors";
import { isStateLost } from "./expired";
import { setBase } from "./virtual/req";

export type Fetch = (url: string, init?: RequestInit) => Promise<Response>;

const MIN_INTERVAL_MS = 30_000;
let lastAt = -Infinity;

export const toDoc = (text: string) => new DOMParser().parseFromString(text, "text/html");

/** fetch だけで MUSCAT のセッションを作り直す(中継ページ → autoLogin → ホーム)。30 秒に 1 回まで。 */
export async function recover(fetchImpl: Fetch, now: () => number = Date.now): Promise<Document> {
  const t = now();
  if (t - lastAt < MIN_INTERVAL_MS) throw new MuscatDownError("復帰は 30 秒に 1 回までです");
  lastAt = t;
  return fetchHome(fetchImpl);
}

/** 中継ページ → autoLogin → ホームの Document。回数の制限なし(サーバーの「今の画面」をホームに戻すのにも使う) */
export async function fetchHome(fetchImpl: Fetch): Promise<Document> {
  let relay: Response;
  try {
    relay = await fetchImpl("/uprx/ShibbolethAuthServlet");
  } catch {
    throw new SsoRequiredError("ログインが切れている可能性があります");
  }
  if (relay.status >= 500) throw new MuscatDownError("MUSCAT が応答しません");
  if (relay.redirected && relay.url && new URL(relay.url).origin !== location.origin) {
    throw new SsoRequiredError("ログインが必要です");
  }
  const form = toDoc(await relay.text()).getElementById("loginForm") as HTMLFormElement | null;
  if (!form) throw new SsoRequiredError("ログインが必要です");

  const body = new URLSearchParams();
  for (const [k, v] of new FormData(form)) if (typeof v === "string") body.set(k, v);
  body.set("loginForm:autoLogin", "loginForm:autoLogin");
  const action = new URL(form.getAttribute("action") ?? "", relay.url || location.href).href;

  let res: Response;
  try {
    res = await fetchImpl(action, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
  } catch {
    throw new SsoRequiredError("ログインが切れている可能性があります");
  }
  const text = await res.text();
  if (isStateLost("page", res.status, text)) throw new MuscatDownError("復帰できませんでした");
  const doc = toDoc(text);
  setBase(doc, res.url || action); // ホームの相対 action は最後の応答の URL に対して解決する
  return doc;
}
