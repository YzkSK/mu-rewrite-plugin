import { HOME_LABEL, SETTING_LABEL } from "../api/labels";
import type { MenuGroup } from "../api/menuGroups";

export const PORTAL_URL = "https://portal.musashino-u.ac.jp/";
export const LMS_URL = "https://musashino-u.myopenlms.net/";
export const NATIVE_LABEL = "元の画面で開く";

/** onSelect は画面を移る・ログアウトなどの操作、href は新しいタブで開く外部リンク */
export type NavItem = { label: string; active?: boolean } & ({ onSelect: () => void } | { href: string });
export type NavGroup = { title: string; items: NavItem[] };
export type NavModel = { home: NavItem; groups: NavGroup[]; footer: NavItem[] };

/** サイドバーの操作。画面の移動は拡張機能の中で完結し、元の画面は動かさない */
export type NavActions = { go(label: string): void; logout(): void; openNative(): void };

/** ホーム + グループ別の項目 + 下の固定部分。title と同じ項目は active。 */
export function drawerItems(nav: NavActions, groups: MenuGroup[], title: string): NavModel {
  const leaf = (label: string): NavItem => ({ label, active: label === title, onSelect: () => nav.go(label) });
  return {
    home: { label: HOME_LABEL, active: title === HOME_LABEL, onSelect: () => nav.go(HOME_LABEL) },
    groups: groups.map((g) => ({ title: g.title, items: g.labels.map(leaf) })),
    footer: [
      // 並びはポータル・LMS とそろえる(外部 → 設定 → 元の画面 → ログアウト)
      { label: "MU ポータルへ", href: PORTAL_URL },
      { label: "MU-LMS へ", href: LMS_URL },
      { ...leaf(SETTING_LABEL) },
      { label: NATIVE_LABEL, onSelect: nav.openNative },
      { label: "ログアウト", onSelect: nav.logout },
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
