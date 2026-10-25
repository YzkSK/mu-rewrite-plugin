import type { CalEvent } from "./lib/lib";

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

export type InfoFile = { uuid?: string; file_name?: string; name?: string };
export type InfoItem = {
  uuid: string; title: string; content?: string; publish_from?: string; publish_start_at: number; is_read?: boolean;
  category?: { name?: string } | null; files?: InfoFile[]; personal_files?: InfoFile[];
};
export type InfoList = { items: InfoItem[]; count: number | null };

export const fetchPageView = async (slug: string): Promise<Json> => (await fetchJson("/api/page/view/" + encodeURIComponent(slug))).result;
export const fetchTree = async (): Promise<PageNode[]> => (await fetchJson("/api/page")).result?.children ?? [];

export async function fetchInfo(query: string): Promise<InfoList> {
  const r = (await fetchJson("/api/information/1?" + query)).result ?? {};
  return { items: r.items ?? [], count: r.item_count ?? null };
}

/** 月の前後1週間を含めて取る。add_outlook_calendar は "false" だと "No token." が返るので 0/1 */
export async function fetchCalendar(sources: string[], addOutLook: boolean, y: number, m: number): Promise<CalEvent[]> {
  const s = Math.floor(new Date(y, m - 1, 1 - 7).getTime() / 1000);
  const e = Math.floor(new Date(y, m, 1 + 7).getTime() / 1000);
  const rs = await Promise.all(sources.map((u) =>
    fetchJson(`/api/calendar/?page_size=500&start_at=${s}&end_at=${e}&calendar_source_uuid=${encodeURIComponent(u)}&add_outlook_calendar=${addOutLook ? 1 : 0}`)));
  return rs.flatMap((r) => r.result?.items ?? []);
}

/** 元のポータルの上のユーザー名。描画されるまで最大 ms 待つ */
export function readUserName(ms = 3000): Promise<string> {
  return new Promise((resolve) => {
    const t0 = Date.now();
    (function poll() {
      const n = document.querySelector('#menu [class*="_name_"]');
      if (n) resolve(n.textContent?.trim() ?? "");
      else if (Date.now() - t0 > ms) resolve("");
      else setTimeout(poll, 100);
    })();
  });
}

/** 元のユーザーメニューを操作して項目を実行する。項目名は言語で変わるので、危険色のクラスと言語メニューの除外で選ぶ */
export function proxyUserMenu(kind: "account" | "signout"): void {
  const t = document.querySelector("#menu .ant-dropdown-trigger");
  if (t) for (const ev of ["mouseover", "mouseenter", "click"]) t.dispatchEvent(new MouseEvent(ev, { bubbles: true }));
  setTimeout(() => {
    const items = [...document.querySelectorAll<HTMLElement>('.ant-dropdown [role="menuitem"]')];
    const danger = (n: Element) => n.classList.contains("ant-dropdown-menu-item-danger");
    const it = items.find((n) => (kind === "signout" ? danger(n) : !danger(n) && !/language/i.test(n.className)));
    if (it) it.click(); else console.warn("[mu-portal] user menu item not found", kind);
  }, 300);
}
