import { expect, test } from "bun:test";
import { renderToString } from "react-dom/server";
import type { CalendarDay, ListPager, TeacherSchedulePage } from "@/muscat/api/types";
import { fakeClient } from "../fakeClient";
import type { LiveState } from "../useLiveScreen";
import { TeacherScheduleScreen } from "./TeacherScheduleScreen";

const client = fakeClient();
const doc = new DOMParser().parseFromString("<p>x</p>", "text/html");
const render = (initial?: LiveState<TeacherSchedulePage>) => renderToString(<TeacherScheduleScreen client={client} doc={doc} initial={initial} />);

const search = {
  name: { ref: "n", value: "麻田" },
  sort: { ref: "s", value: "kana", options: [{ value: "kana", label: "カナ氏名" }, { value: "en", label: "英語氏名" }] },
  ascending: true, toggleRef: "t", clearRef: "c", searchRef: "q",
};
const pager = (o: Partial<ListPager> = {}): ListPager => ({ total: 1, page: 1, pages: 1, pageLinks: [], firstRef: "", prevRef: "", nextRef: "", lastRef: "", size: null, ...o });
const row = { name: "山田 太郎", kana: "ヤマダ タロウ", english: "Yamada Taro", dept: "データサイエンス学部", openRef: "o1" };
const day = (n: number, o: Partial<CalendarDay> = {}): CalendarDay => ({ day: n, date: `2026-10-${String(n).padStart(2, "0")}`, other: false, today: false, events: [], ...o });
const days = Array.from({ length: 42 }, (_, i) => day((i % 31) + 1, i === 3 ? { events: [{ time: "08:50", title: "統計学入門" }] } : i === 10 ? { today: true } : {}));
const base: TeacherSchedulePage = { teacher: "", search, list: null, calendar: null, backRef: "" };
const ready = (p: Partial<TeacherSchedulePage> = {}, busy = false): LiveState<TeacherSchedulePage> => ({ status: "ready", page: { ...base, ...p }, busy });

test("検索欄: 氏名・並び順(昇順の切替)・クリア・検索", () => {
  const html = render(ready());
  for (const s of ["教員スケジュール", "氏名", "並び順", "カナ氏名", "昇順 ↑", "クリア", "検索"]) expect(html).toContain(s);
  expect(html).not.toContain("該当する教職員はいません");
});

test("一覧: 件数・氏名(読み)・英語名・所属", () => {
  const html = render(ready({ list: { pager: pager(), rows: [row], empty: false } }));
  for (const s of ["1 件", "山田 太郎", "(ヤマダ タロウ)", "Yamada Taro", "データサイエンス学部", "mu-row"]) expect(html).toContain(s);
});

test("0 件", () => {
  expect(render(ready({ list: { pager: pager({ total: 0 }), rows: [], empty: true } }))).toContain("該当する教職員はいません");
});

test("カレンダー: 教員名・月・移動・戻る・予定・今日・斜めに出るマス", () => {
  const html = render(ready({ teacher: "山田 太郎", search: null, backRef: "b", calendar: { title: "2026年10月", prevRef: "p", nextRef: "n", todayRef: "", days } }));
  for (const s of ["山田 太郎", "さんの予定を見ています", "2026年10月", "‹ 前の月", "次の月 ›", "‹ 検索に戻る", "08:50 統計学入門", "mu-cell", "bg-primary"]) expect(html).toContain(s);
  expect(html.match(/mu-cell/g)).toHaveLength(42);
  expect(html).not.toContain("昇順 ↑");
  expect(html).toMatch(/disabled=""[^>]*>今月</);
});

test("通信中: 結果は薄く、検索は押せない", () => {
  const html = render(ready({ list: { pager: pager(), rows: [row], empty: false } }, true));
  expect(html).toContain("opacity-45");
  expect(html).toMatch(/disabled=""[^>]*>検索</);
});

test("初回の読み込み中・エラー", () => {
  expect(render()).toContain("読み込んでいます");
  expect(render({ status: "error", error: "MUSCAT が応答しません" })).toContain("応答しません");
});
