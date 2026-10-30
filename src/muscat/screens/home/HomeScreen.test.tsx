import { expect, test } from "bun:test";
import { renderToString } from "react-dom/server";
import type { HomeDay, HomeDayItem, HomeNoticeTab, HomePage } from "@/muscat/api/types";
import { fakeClient } from "../fakeClient";
import { HomeScreen } from "./HomeScreen";
import type { HomeState } from "./useHome";

const client = fakeClient();
const doc = new DOMParser().parseFromString("<p>x</p>", "text/html");
const TUE = new Date(2026, 9, 27, 14, 0); // 火曜 14:00(3 限の途中)
const render = (initial?: HomeState, now = TUE) => renderToString(<HomeScreen client={client} doc={doc} initial={initial} now={now} />);

const tabs: HomeNoticeTab[] = [
  { name: "重要", ref: "t1", selected: true, empty: false, items: [{ date: "2026/10/19", title: "件名A", source: "テスト部署", openRef: "n1" }] },
  { name: "期限あり", ref: "t2", selected: false, empty: false, items: [{ date: "2026/10/30", title: "締切B", source: "別部署", openRef: "n2" }] },
];
const item = (title: string, start: string, end: string, o: Partial<HomeDayItem> = {}): HomeDayItem => ({
  start, end, title, teachers: ["教員一", "教員二"], room: "テスト棟101", keijiCount: 0, syllabusRef: "", memo: null, plain: false, ...o,
});
const day: HomeDay = {
  date: "2026/10/27(火)",
  nav: { prevWeek: "", prevDay: "p", today: "t", nextDay: "n", nextWeek: "" },
  allDay: [{ title: "全体連絡", ref: "a1" }],
  items: [item("朝の授業", "8:50", "10:30"), item("授業甲", "13:10", "14:50", { keijiCount: 2 }), item("授業甲", "15:00", "16:40"), item("面談", "17:00", "18:00", { plain: true, teachers: [], room: "" })],
};
const base: HomePage = { unreadKeiji: 18, keijiRef: "k", timetableChangeRef: "c", notices: tabs, day, detail: null };
const ready = (p: Partial<HomePage> = {}, busy = false): HomeState => ({ status: "ready", page: { ...base, ...p }, busy });

test("2 列(狭い画面は 1 列)で、説明文は無い", () => {
  const html = render(ready());
  for (const s of ["md:grid-cols-2", "grid-cols-1"]) expect(html).toContain(s);
  expect(html).not.toContain("ひと目で");
});

test("今日: 題名は日付と授業の要約、前の日・次の日・今日、時間割変更。終日の予定は出さない", () => {
  const html = render(ready());
  for (const s of ["10月27日(火)", "今日の授業 2 科目(1、3・4限)", "前の日", "次の日", "今日", "時間割変更"]) expect(html).toContain(s);
  expect(html).not.toContain("全体連絡");
  expect(html.match(/border-dashed/g)).toHaveLength(1);
});

test("時限: 続く同じ授業は 1 行、空きは「空き」、教室・教員", () => {
  const html = render(ready());
  for (const s of ["3・4限", "13:10","授業甲", "テスト棟101", "教員一、教員二", "掲示 2", "空き"]) expect(html).toContain(s);
  expect(html.match(/授業甲/g)).toHaveLength(1);
});

test("今の時限だけ紫の枠、終わった時限は薄く", () => {
  const html = render(ready());
  expect(html.match(/border-primary bg-accent/g)).toHaveLength(1);
  expect(html).toContain("opacity-45");
  // 別の日は、今も終わった時限も無い
  const other = render(ready({ day: { ...day, date: "2026/10/28(水)" } }));
  expect(other).not.toContain("border-primary bg-accent");
  expect(other).not.toContain("opacity-45");
});

test("授業ではない予定は「自分の予定」にまとめる", () => {
  const html = render(ready());
  expect(html).toContain("自分の予定");
  expect(html).toContain("17:00〜18:00");
  expect(html).toContain("面談");
});

test("授業が無い日", () => {
  expect(render(ready({ day: { ...day, items: [] } }))).toContain("この日は授業がありません");
  expect(render(ready({ day: null }))).toContain("予定を読み込めませんでした");
});

test("お知らせ: 未読の掲示(札に数)の重要と、期限ありの 2 つの Panel", () => {
  const html = render(ready());
  for (const s of ["未読の掲示", "18", "期限あり", "10/19", "件名A", "テスト部署", "10/30", "締切B"]) expect(html).toContain(s);
  expect(html).not.toContain("2026/10/19");
  expect(html).not.toContain("お知らせはありません");
});

test("お知らせが 0 件", () => {
  const html = render(ready({ notices: tabs.map((t) => ({ ...t, items: [] })) }));
  expect(html.match(/お知らせはありません/g)).toHaveLength(2);
});

test("未読数が取れないときは –、操作中は札が無効", () => {
  expect(render(ready({ unreadKeiji: null }))).toContain("–");
  expect(render(ready({}, true))).toMatch(/ disabled=""[^>]*>未読の掲示<b[^>]*>18</);
});

// 元のリンクが無いとき(parseHome は空の ref を返す)、押すと「要素が見つかりません」でエラー画面になるので、そこだけ無効にする
test("元のリンクが無いと無効(もう一方は有効のまま)", () => {
  const noKeiji = render(ready({ keijiRef: "" }));
  expect(noKeiji).toMatch(/ disabled=""[^>]*>未読の掲示<b[^>]*>18</);
  expect(noKeiji).not.toMatch(/ disabled=""[^>]*>\s*時間割変更/);
  const noTimetable = render(ready({ timetableChangeRef: "" }));
  expect(noTimetable).toMatch(/ disabled=""[^>]*>\s*時間割変更/);
  expect(noTimetable).not.toMatch(/ disabled=""[^>]*>未読の掲示<b[^>]*>18</);
});

test("詳細は一覧の上に出る。無ければ出ない", () => {
  const detail = { title: "詳細の件名", fields: [{ label: "件名", text: "詳細の件名", html: "" }], flagged: false, flagRef: "", prevRef: "", nextRef: "", closeRef: "d4" };
  const html = render(ready({ detail }));
  expect(html).toContain("閉じる");
  expect(html.indexOf("詳細の件名")).toBeLessThan(html.indexOf("件名A"));
  expect(render(ready())).not.toContain("閉じる");
});

test("読み込み中・エラー", () => {
  expect(render()).toContain("読み込んでいます");
  expect(render({ status: "error", error: "MUSCAT が応答しません" })).toContain("応答しません");
});
