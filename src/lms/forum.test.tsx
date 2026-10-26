import { expect, test } from "bun:test";
import { renderToString } from "react-dom/server";
import { ForumScreen } from "./ForumScreen";
import { readDiscussionPage, readForumList } from "./forum";

const parse = (html: string) => new DOMParser().parseFromString(html, "text/html");

const LIST = parse(`<html><head><title>アナウンスメント | MU-LMS</title></head><body>
<nav class="breadcrumb"><a href="https://x/course/view.php?id=12">333 専門デプロイメントコースⅢ</a></nav>
<table><tr class="discussion"><th class="topic"><a href="https://x/mod/forum/discuss.php?d=55">授業のZoomアドレス(※MUSCAT掲示と同じです)</a> ロック済み</th>
<td class="author"><a href="https://x/user/view.php?id=7">碧海 寿広 オオミ トシヒロ</a> 2026年 09月 24日</td>
<td class="lastpost"><a href="https://x/user/view.php?id=8">佐藤　康樹 サトウ　コウキ</a> 2026年 10月 1日</td>
<td class="replies">3</td><td>このディスカッションに星を付ける</td></tr>
<tr class="discussion"><th><a href="https://x/mod/forum/discuss.php?d=56">class なしの行</a></th><td><a href="https://x/user/view.php?id=7">碧海 寿広</a> 2026年 09月 25日</td><td>碧海 寿広 2026年 09月 25日</td><td>0</td></tr></table></body></html>`);

test("readForumList: 件名・投稿者・日付・返信数・フォーラム名・コース", () => {
  const l = readForumList(LIST);
  expect(l).toMatchObject({ name: "アナウンスメント", courseId: 12, courseName: "専門デプロイメントコースⅢ" });
  expect(l.discussions[0]).toEqual({ id: 55, subject: "授業のZoomアドレス(※MUSCAT掲示と同じです)", author: "碧海 寿広", at: "2026/9/24", lastAuthor: "佐藤 康樹", lastAt: "2026/10/1", replies: 3 });
  // class が無くても、件名のセルからの並びで読む
  expect(l.discussions[1]).toMatchObject({ id: 56, author: "碧海 寿広", at: "2026/9/25", lastAuthor: "碧海 寿広", replies: 0 });
});

const DISC = parse(`<html><head><title>x</title></head><body>
<nav class="breadcrumb"><a href="/course/view.php?id=12">333 専門</a><a href="/mod/forum/view.php?id=9">アナウンスメント</a></nav>
<article class="forum-post-container" data-post-id="1"><header><h3>件名A</h3><a href="/user/view.php?id=7"><img></a><a href="/user/view.php?id=7">碧海　寿広 オオミ　トシヒロ</a><time>2026年 9月 24日(木曜日) 10:00</time></header>
<div class="post-content-container"><p>本文<script>alert(1)</script><b onclick="x()">太字</b></p></div></article></body></html>`);

test("readDiscussionPage: 投稿は sanitize、フォーラムへの戻り先", () => {
  const p = readDiscussionPage(DISC, "?d=55");
  expect(p).toMatchObject({ d: 55, forumUrl: "/mod/forum/view.php?id=9", forumName: "アナウンスメント", courseId: 12 });
  expect(p.posts).toHaveLength(1);
  expect(p.posts[0]).toMatchObject({ id: "1", subject: "件名A", author: "碧海 寿広", at: "2026年 9月 24日(木曜日) 10:00" });
  expect(p.posts[0]!.html).toBe("<p>本文<b>太字</b></p>");
});

test("ForumScreen: 一覧と最初の投稿・投稿 0 件", () => {
  const list = readForumList(LIST);
  const h = renderToString(<ForumScreen list={list} listUrl={null} d={55} posts={readDiscussionPage(DISC, "?d=55").posts} forumName="アナウンスメント" courseId={12} courseName="専門" />);
  for (const t of ["授業のZoomアドレス", "返信 3", "太字", "本文", "‹ 専門"]) expect(h).toContain(t);
  expect(renderToString(<ForumScreen list={{ ...list, discussions: [] }} listUrl={null} d={null} forumName="a" courseId={null} courseName="" />)).toContain("まだ投稿はありません");
});
