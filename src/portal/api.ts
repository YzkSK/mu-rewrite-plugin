import { flattenCategories, notifyQuery, type CalEvent, type FlatCategory, type NotifyOpts } from "./lib/lib";

export type Json = any;

/** このAPIはエラーでも HTTP 200 で is_successful:false を返す */
export async function fetchJson(url: string): Promise<Json> {
  const r = await fetch(url, { credentials: "include" });
  if (!r.ok) throw new Error(url + " " + r.status);
  const j = await r.json();
  if (j && j.is_successful === false) throw new Error(url + " " + (j.result?.message || "failed"));
  return j;
}

export type PageNode = { title: string; slug?: string; external_link?: string | null; children?: PageNode[] };

export type InfoFile = { uuid?: string; file_name?: string; name?: string; mime_type?: string };
export type InfoItem = {
  uuid: string; title: string; content?: string; publish_from?: string; publish_start_at: number; publish_end_at?: number; is_read?: boolean;
  event_title?: string; event_start_at?: number; event_end_at?: number;
  category?: { name?: string } | null; files?: InfoFile[]; personal_files?: InfoFile[];
};
export type InfoList = { items: InfoItem[]; count: number | null };

export const fetchPageView = async (slug: string): Promise<Json> => (await fetchJson("/api/page/view/" + encodeURIComponent(slug))).result;
export const fetchTree = async (): Promise<PageNode[]> => (await fetchJson("/api/page")).result?.children ?? [];

export async function fetchInfo(query: string): Promise<InfoList> {
  const r = (await fetchJson("/api/information/1?" + query)).result ?? {};
  return { items: r.items ?? [], count: r.item_count ?? null };
}

export type SharedItem = { uuid: string; name: string; is_file: boolean; has_read_permission?: boolean; size?: number; updated_at?: number };

/** フォルダの中身を全件取る(1 ページ 20 件。2 ページ目以降はいっぺんに取る) */
export async function fetchSharedItems(folder: string): Promise<SharedItem[]> {
  const url = (n: number) => `/api/shared-item/${n}/${encodeURIComponent(folder)}`;
  const first = (await fetchJson(url(1))).result ?? {};
  const total = Math.max(1, Number(first.page_total) || 1);
  const rest = await Promise.all(Array.from({ length: total - 1 }, (_, i) => fetchJson(url(i + 2))));
  return [first, ...rest.map((r) => r.result ?? {})].flatMap((r) => r.items ?? []);
}

export type NoticePage = { items: InfoItem[]; pageTotal: number; count: number | null };

export async function fetchNotices(o: NotifyOpts): Promise<NoticePage> {
  const r = (await fetchJson(notifyQuery(o))).result ?? {};
  return { items: r.items ?? [], pageTotal: r.page_total || 1, count: r.item_count ?? null };
}

export async function fetchCategories(): Promise<FlatCategory[]> {
  return flattenCategories((await fetchJson("/api/information-category/tree")).result?.items);
}

/**
 * 元のサイトと同じ CSRF ヘッダ。_csrf クッキー(PHP のシリアライズ文字列)の token を、毎回の乱数と XOR して
 * 「乱数 + 結果」を base64url にしたもの(元のポータルの GE())。token をそのまま送ると「データ送信を検証できませんでした」(実機で確認)
 */
export function csrfHeaders(cookie: string, random: (n: number) => Uint8Array = (n) => crypto.getRandomValues(new Uint8Array(n))): Record<string, string> {
  const c = cookie.split(/;\s*/).find((p) => p.startsWith("_csrf="));
  let token: string | undefined;
  try { token = c ? decodeURIComponent(c.slice(6)).match(/i:1;s:\d+:"([^"]+)"/)?.[1] : undefined; } catch { token = undefined; }
  if (!token) return {};
  const bytes = new TextEncoder().encode(token);
  const mask = random(bytes.length);
  const out = new Uint8Array(bytes.length * 2);
  out.set(mask, 0);
  out.set(bytes.map((b, i) => b ^ mask[i]!), bytes.length);
  const b64 = btoa(String.fromCharCode(...out)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
  return { "X-CSRF-Token": b64 };
}

/** 書き込み系(PUT/POST/DELETE)。body が undefined なら本文なし */
export async function sendJson(method: string, url: string, body?: unknown): Promise<Json> {
  const r = await fetch(url, {
    method, credentials: "include",
    headers: { "Content-Type": "application/json", ...csrfHeaders(document.cookie) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!r.ok) throw new Error(url + " " + r.status);
  const j = await r.json();
  if (j && j.is_successful === false) throw new Error(url + " " + (j.result?.message || "failed"));
  return j;
}

// 本文は元と同じ {uuid:[…]}。配列だけを送ると成功が返るのに何も変わらなかった(実機で確認)
export const setRead = (uuid: string, read: boolean): Promise<Json> => sendJson("PUT", `/api/information/set-${read ? "read" : "unread"}-selected/`, { uuid: [uuid] });

/** 月の前後1週間を含めて取る。add_outlook_calendar は "false" だと "No token." が返るので 0/1 */
export async function fetchCalendar(sources: string[], addOutLook: boolean, y: number, m: number): Promise<CalEvent[]> {
  const s = Math.floor(new Date(y, m - 1, 1 - 7).getTime() / 1000);
  const e = Math.floor(new Date(y, m, 1 + 7).getTime() / 1000);
  const rs = await Promise.all(sources.map((u) =>
    fetchJson(`/api/calendar/?page_size=500&start_at=${s}&end_at=${e}&calendar_source_uuid=${encodeURIComponent(u)}&add_outlook_calendar=${addOutLook ? 1 : 0}`)));
  return rs.flatMap((r) => r.result?.items ?? []);
}

export type DeviceItem = { id: string | number; device_type?: string; created_at?: number };
export type LogItem = { uuid: string; action?: string; type?: string; platform?: string; description?: string; remote_address?: string; created_at?: number };
export type Paged<T> = { items: T[]; pageTotal: number };

// 端末の token 類は触らない: 必要な項目だけ取り出す
export async function fetchDevices(page: number): Promise<Paged<DeviceItem>> {
  const r = (await fetchJson("/api/device/" + page)).result ?? {};
  const items = (r.items ?? []).map((d: Json) => ({ id: d.id, device_type: d.device_type, created_at: d.created_at }));
  return { items, pageTotal: r.page_total || 1 };
}

export async function fetchActionLog(page: number): Promise<Paged<LogItem>> {
  const r = (await fetchJson("/api/action-log/user-view/" + page)).result ?? {};
  const items = (r.items ?? []).map((l: Json) => ({
    uuid: l.uuid, action: l.action, type: l.type, platform: l.platform, description: l.description, remote_address: l.remote_address, created_at: l.created_at,
  }));
  return { items, pageTotal: r.page_total || 1 };
}

/** 画面に出す項目だけ型にする(ほかは触らない) */
export type PortalUser = {
  user_id?: string; personal_id?: string; name?: string; name_kana?: string | null; name_alphabet?: string | null; email?: string | null;
  display_group_names?: string[] | null;
} & { [K in `option_${1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10}`]?: string | null };

/** ログイン中のユーザー(氏名・ID・所属など) */
export async function fetchMe(): Promise<PortalUser> {
  const u = (await fetchJson("/api/auth/check-logged-in")).user;
  if (!u) throw new Error("check-logged-in: no user");
  return u;
}

/** サインアウト(GET)。成功後の移動は呼び出し側 */
export const logout = (): Promise<Json> => fetchJson("/api/auth/logout");
export const deleteDevice = (id: string | number): Promise<Json> => sendJson("DELETE", "/api/device/delete/" + encodeURIComponent(String(id)));
export const deleteAllDevices = (): Promise<Json> => sendJson("DELETE", "/api/device/delete-all");
