import type { MenuGroup } from "../api/menuGroups";
import { nativeHome, nativeLogout, nativeNav, SETTING_LABEL } from "./nativeNav";

export const PORTAL_URL = "https://portal.musashino-u.ac.jp/";
export const LMS_URL = "https://musashino-u.myopenlms.net/";

/** onSelect は元の画面のメニューを押す操作、href は新しいタブで開く外部リンク */
export type NavItem = { label: string; active?: boolean } & ({ onSelect: () => void } | { href: string });
export type NavGroup = { title: string; items: NavItem[] };
export type NavModel = { home: NavItem; groups: NavGroup[]; footer: NavItem[] };

/** ホーム + グループ別の項目 + 下の固定部分。title と同じ項目は active。 */
export function drawerItems(doc: Document, groups: MenuGroup[], title: string): NavModel {
  const leaf = (label: string): NavItem => ({ label, active: label === title, onSelect: () => void nativeNav(doc, label) });
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
