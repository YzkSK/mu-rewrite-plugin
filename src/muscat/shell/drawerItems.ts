import type { DrawerItem } from "@/ui/Drawer";
import { nativeHome, nativeLogout, nativeNav } from "./nativeNav";

export const PORTAL_URL = "https://portal.musashino-u.ac.jp/";
export const LMS_URL = "https://musashino-u.myopenlms.net/";

/** ホーム + メニューの項目 + 外部リンク + ログアウト。今の画面(title と同じ項目)は除く */
export function drawerItems(doc: Document, menuLabels: string[], title: string): DrawerItem[] {
  const items: DrawerItem[] = [
    { label: "ホーム", onSelect: () => void nativeHome(doc) },
    ...menuLabels.map((label) => ({ label, onSelect: () => void nativeNav(doc, label) })),
    { label: "MU ポータルへ", href: PORTAL_URL },
    { label: "MU-LMS へ", href: LMS_URL },
    { label: "ログアウト", onSelect: () => void nativeLogout(doc) },
  ];
  return items.filter((i) => i.label !== title);
}

/** 元のページの `p.loginInfo`(「○○さん ...」)からユーザー名。無ければ undefined */
export function loginUserOf(doc: Document): string | undefined {
  const text = doc.querySelector("p.loginInfo")?.textContent ?? "";
  return text.match(/^\s*(.+?)\s*さん/)?.[1]?.trim() || undefined;
}
