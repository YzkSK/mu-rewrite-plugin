import { courseName } from "@/portal/lib/lms";
import { sanitize } from "@/portal/lib/sanitize";
import { fetchDoc, shortName } from "./api";

export type Discussion = { id: number; subject: string; author: string; at: string; lastAuthor: string; lastAt: string; replies: number };
/** 一覧のページ(view.php)から読んだもの */
export type ForumList = { name: string; courseId: number | null; courseName: string; discussions: Discussion[] };
export type Post = { id: string; subject: string; at: string; author: string; /** sanitize 済み */ html: string };
/** 本文のページ(discuss.php)から読んだもの */
export type DiscussionPage = { d: number | null; forumUrl: string | null; forumName: string; courseId: number | null; courseName: string; posts: Post[] };

const squash = (s: string | null | undefined): string => (s ?? "").replace(/\s+/g, " ").trim();
const DATE = /(\d{4})年\s*(\d{1,2})月\s*(\d{1,2})日/;

/** セルの中の日付を 2026/9/24 に。無ければ空 */
const dateOf = (c: Element | null | undefined): string => {
  const m = DATE.exec(squash(c?.textContent));
  return m ? `${m[1]}/${+m[2]!}/${+m[3]!}` : "";
};

/** セルの中の投稿者(リンクの文字、無ければ日付より前の文字)を姓名にする */
const whoOf = (c: Element | null | undefined): string => {
  const link = [...(c?.querySelectorAll('a[href*="user/view.php"], a[href*="profile.php"]') ?? [])].find((a) => squash(a.textContent));
  return shortName(link ? squash(link.textContent) : squash(c?.textContent).replace(DATE, ""));
};

const idOf = (href: string | null | undefined, key: string): number | null => {
  const n = Number(new URL(href ?? "", "http://x").searchParams.get(key));
  return n > 0 ? n : null;
};

/** パンくずのコースのリンク(id と名前)。無ければ null・空 */
export function readCourseCrumb(doc: Document): { courseId: number | null; courseName: string } {
  const a = doc.querySelector('.breadcrumb a[href*="/course/view.php"]');
  return { courseId: idOf(a?.getAttribute("href"), "id"), courseName: courseName(squash(a?.textContent)) };
}

/** 一覧のページの <title>「アナウンスメント | MU-LMS」の前半 */
const forumNameOf = (doc: Document): string => squash(doc.title.split("|")[0]);

/** フォーラムの一覧(tr.discussion)を読む。セルは class で、無ければ件名のセルからの並びで探す */
export function readForumList(doc: Document): ForumList {
  const discussions = [...doc.querySelectorAll("tr.discussion")].flatMap((tr): Discussion[] => {
    const link = tr.querySelector('a[href*="discuss.php"]');
    const id = idOf(link?.getAttribute("href"), "d");
    if (!link || id === null) return [];
    const cells = [...tr.querySelectorAll("th, td")];
    const at = cells.findIndex((c) => c.contains(link));
    const cell = (cls: string, off: number): Element | undefined => tr.querySelector(`.${cls}`) ?? cells[at + off];
    const replies = squash(cell("replies", 3)?.textContent).match(/\d+/)?.[0];
    return [{
      id, subject: squash(link.textContent),
      author: whoOf(cell("author", 1)), at: dateOf(cell("author", 1)),
      lastAuthor: whoOf(cell("lastpost", 2)), lastAt: dateOf(cell("lastpost", 2)),
      replies: replies ? Number(replies) : 0,
    }];
  });
  return { name: forumNameOf(doc), ...readCourseCrumb(doc), discussions };
}

/** 本文のページの投稿を読む(本文は sanitize) */
export function readDiscussionPage(doc: Document, search: string): DiscussionPage {
  const posts = [...doc.querySelectorAll("article.forum-post-container")].map((a, i): Post => ({
    id: a.getAttribute("data-post-id") ?? String(i),
    subject: squash(a.querySelector("header h3")?.textContent),
    at: squash(a.querySelector("header time")?.textContent),
    author: whoOf(a.querySelector("header")),
    html: sanitize(a.querySelector(".post-content-container")?.innerHTML),
  }));
  const f = doc.querySelector('.breadcrumb a[href*="/mod/forum/view.php"]');
  return { d: idOf(`?${search.replace(/^\?/, "")}`, "d"), forumUrl: f?.getAttribute("href") ?? null, forumName: squash(f?.textContent), ...readCourseCrumb(doc), posts };
}

export const loadForumList = async (url: string): Promise<ForumList> => readForumList(await fetchDoc(url));
export const loadPosts = async (d: number): Promise<Post[]> => readDiscussionPage(await fetchDoc(`/mod/forum/discuss.php?d=${d}`), "").posts;
