import type { DriveStep } from "@/muscat/api/driver/drive";
import type { NewsGroup, NewsPage } from "@/muscat/api/types";

/** 画面の上で切り替えるだけではサーバーに保存されない。グループ/タブの「更新」→ 確認の OK で初めて保存される */
export const canSave = (page: NewsPage, updateRef: string) => !!updateRef && !!page.confirmYesRef;

const save = (page: NewsPage, updateRef: string): DriveStep[] => [
  { kind: "click", ref: updateRef, ajax: false },
  { kind: "click", ref: page.confirmYesRef, ajax: true },
];

/** 行のフラグ・既読(toggleRef)を切り替えて保存する */
export const toggleSteps = (page: NewsPage, toggleRef: string, updateRef: string): DriveStep[] => [{ kind: "click", ref: toggleRef, ajax: false }, ...save(page, updateRef)];

/** グループの未読の行をすべて既読にして保存する。対象が無い・保存できないときは null */
export function markAllReadSteps(page: NewsPage, group: NewsGroup): DriveStep[] | null {
  const unread = group.items.filter((i) => i.unread && i.readRef);
  if (!unread.length || !canSave(page, group.updateRef)) return null;
  return [...unread.map((i): DriveStep => ({ kind: "click", ref: i.readRef, ajax: false })), ...save(page, group.updateRef)];
}
