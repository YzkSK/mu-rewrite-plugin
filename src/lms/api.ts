/** セッション切れ(ログインし直しが要る) */
export class LoginRequiredError extends Error {
  constructor() { super("servicerequireslogin"); }
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
    throw new Error(`${methodname} ${first?.exception?.message ?? "failed"}`);
  }
  return first.data as T;
}

/** fullname は「佐藤　康樹 サトウ　コウキ」の形。先頭 2 つ(姓・名)を半角空白でつなぐ */
export const shortName = (fullname: string): string => fullname.split(/[\s　]+/).filter(Boolean).slice(0, 2).join(" ");

export async function fetchUserName(userId: number): Promise<string> {
  const d = await ajax<{ fullname: string }[]>("core_message_get_member_info", {
    referenceuserid: userId, userids: [userId], includecontactrequests: false, includeprivacyinfo: false,
  });
  return shortName(d[0]?.fullname ?? "");
}
