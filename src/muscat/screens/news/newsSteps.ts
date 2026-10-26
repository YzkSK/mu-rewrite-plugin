import type { NewsGroup, NewsPage } from "@/muscat/api/types";

/** グループの「更新」は、確認の OK のあと、そのグループの掲示をすべて既読にする(利用者が実ページで確認) */
export const canMarkAllRead = (page: NewsPage, group: NewsGroup) => !!group.updateRef && !!page.confirmYesRef;
