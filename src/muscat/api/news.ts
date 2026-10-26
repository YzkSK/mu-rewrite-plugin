import type { Core } from "./core";
import { ParseError } from "./errors";
import { parseNews } from "./parse/news";
import type { NewsPage } from "./types";

/** 生きたページ(掲示板)を読む。操作は press や下の操作名で、読んだ結果の ref を使う */
export const readNews = (core: Core): Promise<NewsPage> => core.runLive(async (live) => parseNews(live.doc));

/** 検索欄を入れて検索を押す。ref は同じ複製を読み直して取る(読んだ時から描き直されていても外れない) */
export const searchNews = (core: Core, q: { keyword: string; course: string }): Promise<void> =>
  core.runLive(async (live) => {
    const p = parseNews(live.doc);
    if (!p.searchRef) throw new ParseError("掲示板の検索ボタンがありません");
    await live.drive([
      { kind: "set", ref: p.keywordRef, value: q.keyword },
      { kind: "set", ref: p.courseRef, value: q.course },
      { kind: "click", ref: p.searchRef },
    ]);
  });

/** グループの「更新」は、確認の OK のあと、そのグループの掲示をすべて既読にする(利用者が実ページで確認) */
export const markAllReadNews = (core: Core, groupTitle: string): Promise<void> =>
  core.runLive(async (live) => {
    const p = parseNews(live.doc);
    const g = p.groups?.find((x) => x.title === groupTitle);
    if (!g) throw new ParseError("掲示のグループがありません");
    if (!g.items.some((i) => i.unread)) throw new ParseError("未読の掲示がありません");
    if (!g.updateRef || !p.confirmYesRef) throw new ParseError("すべて既読にするボタンがありません");
    await live.drive([
      { kind: "click", ref: g.updateRef },
      { kind: "click", ref: p.confirmYesRef },
    ]);
  });
