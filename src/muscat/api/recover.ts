import { MuscatDownError, SsoRequiredError } from "./errors";
import { isStateLost } from "./expired";

export type Fetch = (url: string, init?: RequestInit) => Promise<Response>;

const MIN_INTERVAL_MS = 30_000;
let lastAt = -Infinity;

const toDoc = (text: string) => new DOMParser().parseFromString(text, "text/html");

/** fetch だけで MUSCAT のセッションを作り直す(中継ページ → autoLogin → ホーム)。30 秒に 1 回まで。 */
export async function recover(fetchImpl: Fetch, now: () => number = Date.now): Promise<Document> {
  const t = now();
  if (t - lastAt < MIN_INTERVAL_MS) throw new MuscatDownError("復帰は 30 秒に 1 回までです");
  lastAt = t;

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
  return toDoc(text);
}
