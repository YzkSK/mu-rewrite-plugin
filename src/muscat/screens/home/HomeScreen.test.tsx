import { expect, test } from "bun:test";
import { renderToString } from "react-dom/server";
import type { HomeLesson, HomeNoticeTab, HomePage } from "@/muscat/api/types";
import { fakeClient } from "../fakeClient";
import { HomeScreen } from "./HomeScreen";
import type { HomeState } from "./useHome";

const client = fakeClient();
const doc = new DOMParser().parseFromString("<p>x</p>", "text/html");
const MON = new Date(2026, 9, 19); // 月曜
const render = (initial?: HomeState) => renderToString(<HomeScreen client={client} doc={doc} initial={initial} now={MON} />);

const tabs: HomeNoticeTab[] = [
  { name: "重要", ref: "t1", selected: true, empty: false, items: [{ date: "2026/10/19", title: "件名A", source: "テスト部署", openRef: "n1" }] },
  { name: "期限あり", ref: "t2", selected: false, empty: true, items: [] },
];
const lessons: HomeLesson[] = [{ slots: [{ weekday: "月", period: 3 }, { weekday: "月", period: 4 }], title: "授業甲", teachers: ["教員一", "教員二"], room: "テスト棟101", keijiCount: 2 }];
const base: HomePage = { unreadKeiji: 18, keijiRef: "k", timetableChangeRef: "c", notices: tabs, lessons, detail: null };
const ready = (p: Partial<HomePage> = {}, busy = false): HomeState => ({ status: "ready", page: { ...base, ...p }, busy });

test("見出し・リード文・インフォメーションのタイル・2 列", () => {
  const html = render(ready());
  for (const s of ["ホーム", "今日の授業と、未読のお知らせをひと目で。", "未読の掲示", "18", "時間割変更", "md:grid-cols-2", "grid-cols-1"]) expect(html).toContain(s);
});

test("お知らせ: 選択中のタブの行(MM/DD・件名・発信元)", () => {
  const html = render(ready());
  for (const s of ["お知らせ", "重要", "期限あり", "10/19", "件名A", "テスト部署"]) expect(html).toContain(s);
  expect(html).not.toContain("2026/10/19");
  expect(html).not.toContain("お知らせはありません");
});

test("お知らせが 0 件のタブ", () => {
  const html = render(ready({ notices: tabs.map((t, i) => ({ ...t, selected: i === 1 })) }));
  expect(html).toContain("お知らせはありません");
  expect(html).not.toContain("件名A");
});

test("今日の授業: 日付と曜日、時限(開始時刻)、教員と教室、掲示の件数", () => {
  const html = render(ready());
  for (const s of ["10/19 月", "3・4限", "13:00", "授業甲", "教員一、教員二", "テスト棟101", "掲示 2"]) expect(html).toContain(s);
});

test("授業が無い日", () => {
  expect(render(ready({ lessons: [] }))).toContain("今日は授業がありません");
});

test("未読数が取れないときは –、操作中はタイルが無効", () => {
  expect(render(ready({ unreadKeiji: null }))).toContain("–");
  expect(render(ready({}, true))).toMatch(/ disabled=""[^>]*>\s*<b[^>]*>18</);
});

test("詳細は一覧の上に出る。無ければ出ない", () => {
  const detail = { title: "詳細の件名", fields: [{ label: "件名", text: "詳細の件名", html: "" }], flagged: false, flagRef: "", prevRef: "", nextRef: "", closeRef: "d4" };
  const html = render(ready({ detail }));
  expect(html).toContain("閉じる");
  expect(html.indexOf("詳細の件名")).toBeLessThan(html.indexOf("件名A"));
  expect(render(ready())).not.toContain("閉じる");
});

test("読み込み中・エラー", () => {
  expect(render()).toContain("読み込み中");
  expect(render({ status: "error", error: "MUSCAT が応答しません" })).toContain("応答しません");
});
