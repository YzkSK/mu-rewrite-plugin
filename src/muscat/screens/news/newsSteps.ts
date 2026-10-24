import type { DriveStep } from "@/muscat/api/driver/drive";
import type { NewsGroup, NewsPage } from "@/muscat/api/types";

/** グループの「更新」は、確認の OK のあと、そのグループの掲示をすべて既読にする(利用者が実ページで確認) */
export const canMarkAllRead = (page: NewsPage, group: NewsGroup) => !!group.updateRef && !!page.confirmYesRef;

/** 行のフラグ・既読は、その行の切り替えボタンを押すだけ(「更新」を押すとグループ全部が既読になるので使わない) */
export const toggleSteps = (toggleRef: string): DriveStep[] => [{ kind: "click", ref: toggleRef, ajax: true }];

/** グループをすべて既読にする = 「更新」→ 確認の OK。未読が無い・押せないときは null */
export function markAllReadSteps(page: NewsPage, group: NewsGroup): DriveStep[] | null {
  if (!group.items.some((i) => i.unread) || !canMarkAllRead(page, group)) return null;
  return [
    { kind: "click", ref: group.updateRef, ajax: false },
    { kind: "click", ref: page.confirmYesRef, ajax: true },
  ];
}
