/** セッション切れ(ログインし直しが要る) */
export class LoginRequiredError extends Error {
  constructor() { super("servicerequireslogin"); }
}

/** Web サービスのエラー(code は Moodle の errorcode) */
export class AjaxError extends Error {
  constructor(message: string, readonly code: string) { super(message); }
}

let sesskey = "";
export const setSesskey = (s: string): void => { sesskey = s; };
export const getSesskey = (): string => sesskey;

/** Moodle の Web サービス(AJAX)。エラーも HTTP 200 の配列で返る */
export async function ajax<T>(methodname: string, args: unknown): Promise<T> {
  const r = await fetch(`/lib/ajax/service.php?sesskey=${encodeURIComponent(sesskey)}&info=${methodname}`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify([{ index: 0, methodname, args }]),
  });
  if (!r.ok) throw new Error(`${methodname} ${r.status}`);
  const j = await r.json();
  const first = Array.isArray(j) ? j[0] : null;
  if (!first || first.error) {
    if (first?.exception?.errorcode === "servicerequireslogin") throw new LoginRequiredError();
    throw new AjaxError(`${methodname} ${first?.exception?.message ?? "failed"}`, first?.exception?.errorcode ?? "");
  }
  return first.data as T;
}

/** 転送を追った先がログイン画面か(r.url が空なら今のページ) */
export const isLoginRedirect = (r: Response): boolean => new URL(r.url || location.href).pathname.startsWith("/login/");

export const errText = (e: unknown): string => (e instanceof Error ? e.message : String(e));

/**
 * ページを取る。ログインが切れていたら LoginRequiredError。
 * 切れ方は 3 通り: /login/ への転送、別オリジンの SSO への転送(fetch が TypeError)、ゲストとして開かれたページ(body.notloggedin)
 */
export async function fetchPage(url: string | URL, init: RequestInit = {}): Promise<Response> {
  let r: Response;
  try {
    r = await fetch(url, { ...init, credentials: "include" });
  } catch (e) {
    // TypeError の理由は分からないので、ajax で確かめる。元のリクエストは POST の二重送信を避けるため送り直さない
    if (e instanceof TypeError) {
      try { await ajax("core_session_time_remaining", {}); } catch (check) { if (check instanceof LoginRequiredError) throw check; }
    }
    throw e;
  }
  if (isLoginRedirect(r)) throw new LoginRequiredError();
  const guest = new DOMParser().parseFromString(await r.clone().text(), "text/html").body.classList.contains("notloggedin");
  if (guest) throw new LoginRequiredError();
  return r;
}

/** ページを取って DOM にする */
export async function fetchDoc(url: string): Promise<Document> {
  const r = await fetchPage(url);
  if (!r.ok) throw new Error(`${url} ${r.status}`);
  return new DOMParser().parseFromString(await r.text(), "text/html");
}

/** fullname は「佐藤　康樹 サトウ　コウキ」の形。先頭 2 つ(姓・名)を半角空白でつなぐ */
export const shortName = (fullname: string): string => fullname.split(/[\s　]+/).filter(Boolean).slice(0, 2).join(" ");

/** userId の名前。基準(referenceuserid)は自分でないと権限エラーになる(実機で確認)。省略時は本人 */
export async function fetchUserName(userId: number, me = userId): Promise<string> {
  const d = await ajax<{ fullname: string }[]>("core_message_get_member_info", {
    referenceuserid: me, userids: [userId], includecontactrequests: false, includeprivacyinfo: false,
  });
  return shortName(d[0]?.fullname ?? "");
}
