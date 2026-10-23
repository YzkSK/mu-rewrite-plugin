import { expect, test } from "bun:test";
import { renderToString } from "react-dom/server";
import type { NewsDetail, NewsItem, NewsPage } from "@/muscat/api/types";
import { fakeClient } from "../fakeClient";
import { NewsScreen } from "./NewsScreen";
import type { NewsState } from "./useNews";

const client = fakeClient();
const doc = new DOMParser().parseFromString("<p>x</p>", "text/html");
const render = (initial?: NewsState) => renderToString(<NewsScreen client={client} doc={doc} initial={initial} />);

const item = (o: Partial<NewsItem> = {}): NewsItem => ({
  title: "件名A", category: "授業", source: "テスト部署", date: "2026/10/12", important: false, isNew: false, unread: false, flagged: false, openRef: "c1", flagRef: "c2", readRef: "c3", ...o,
});
const tabs = ["グループ", "全表示", "未読"].map((name, i) => ({ name, ref: `t${i}`, selected: name === "全表示" }));
const base: NewsPage = { tabs, keyword: "", course: "", keywordRef: "k", courseRef: "j", searchRef: "s", groups: null, items: [item()], empty: false, detail: null };
const ready = (p: Partial<NewsPage> = {}, busy = false): NewsState => ({ status: "ready", page: { ...base, ...p }, busy });

test("平らな一覧: 件名・分類・発信元・MM/DD、未読は強調、重要・新着のバッジ", () => {
  const html = render(ready({ items: [item({ unread: true, important: true, isNew: true })] }));
  for (const s of ["件名A", "授業", "テスト部署", "10/12", "重要", "新着", "font-bold", "既読にする", "フラグ", "時系列"]) expect(html).toContain(s);
  expect(html).not.toContain("2026/10/12");
  expect(render(ready())).not.toContain("font-bold");
});

test("既読の行は「未読にする」、フラグ付きは「フラグを外す」", () => {
  const html = render(ready({ items: [item({ unread: false, flagged: true })] }));
  expect(html).toContain("未読にする");
  expect(html).toContain("フラグを外す");
});

test("グループ: 分類ごとのカードに件数", () => {
  const html = render(ready({ groups: [{ title: "授業関連", items: [item(), item({ title: "B" })] }, { title: "その他", items: [] }] }));
  expect(html).toContain("授業関連(2)");
  expect(html).toContain("その他(0)");
});

test("操作中は行のトグルが無効", () => {
  const on = / disabled=""[^>]*>未読にする</;
  expect(render(ready({}, true))).toMatch(on);
  expect(render(ready({}, false))).not.toMatch(on);
});

test("詳細: 項目名と値、本文はサニタイズ、前へ/次へ/閉じる", () => {
  const detail: NewsDetail = {
    title: "詳細の件名",
    fields: [{ label: "件名", text: "詳細の件名", html: "" }, { label: "本文", text: "", html: `<p onclick="x()">本文<script>alert(1)</script></p>` }],
    flagged: false, flagRef: "d1", prevRef: "d2", nextRef: "d3", closeRef: "d4",
  };
  const html = render(ready({ detail }));
  for (const s of ["詳細の件名", "本文", "前へ", "次へ", "閉じる"]) expect(html).toContain(s);
  expect(html).toContain("<p>本文</p>");
  expect(html).not.toContain("onclick");
  expect(render(ready())).not.toContain("前へ");
});

test("データなし・読み込み中・エラー", () => {
  expect(render(ready({ items: [], empty: true }))).toContain("該当する掲示はありません");
  expect(render()).toContain("読み込み中");
  expect(render({ status: "error", error: "MUSCAT が応答しません" })).toContain("応答しません");
});
