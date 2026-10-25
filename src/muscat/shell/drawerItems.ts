import type { MenuGroup } from "../api/menuGroups";
import { nativeHome, nativeLogout, nativeNav, SETTING_LABEL } from "./nativeNav";

export const PORTAL_URL = "https://portal.musashino-u.ac.jp/";
export const LMS_URL = "https://musashino-u.myopenlms.net/";

/** onSelect は元の画面のメニューを押す操作、href は新しいタブで開く外部リンク */
/** badge は項目の横の数(掲示板の未読) */
export type NavItem = { label: string; active?: boolean; badge?: number } & ({ onSelect: () => void } | { href: string });
export type NavGroup = { title: string; items: NavItem[] };
export type NavModel = { home: NavItem; groups: NavGroup[]; footer: NavItem[] };

/** ホーム + グループ別の項目 + 下の固定部分。title と同じ項目は active。unread は掲示板の横に出す未読の数 */
export function drawerItems(doc: Document, groups: MenuGroup[], title: string, unread = 0): NavModel {
  const leaf = (label: string): NavItem => ({ label, active: label === title, onSelect: () => void nativeNav(doc, label), ...(label === "掲示板" && unread > 0 ? { badge: unread } : {}) });
  return {
    home: { label: "ホーム", active: title === "ホーム", onSelect: () => void nativeHome(doc) },
    groups: groups.map((g) => ({ title: g.title, items: g.labels.map(leaf) })),
    footer: [
      { ...leaf(SETTING_LABEL) },
      { label: "MU ポータルへ", href: PORTAL_URL },
      { label: "MU-LMS へ", href: LMS_URL },
      { label: "ログアウト", onSelect: () => void nativeLogout(doc) },
    ],
  };
}

/** 元のページの `p.loginInfo`(「○○さん ...」)からユーザー名。無ければ undefined */
export function loginUserOf(doc: Document): string | undefined {
  const text = doc.querySelector("p.loginInfo")?.textContent ?? "";
  return text.match(/^\s*(.+?)\s*さん/)?.[1]?.trim() || undefined;
}

/** 同じ `p.loginInfo` の「前回ログイン：」のあと(例: 2026/10/25 01:29)。無ければ undefined */
export function lastLoginOf(doc: Document): string | undefined {
  const text = doc.querySelector("p.loginInfo")?.textContent ?? "";
  return text.match(/前回ログイン[:：]\s*(.+)/)?.[1]?.trim() || undefined;
}
