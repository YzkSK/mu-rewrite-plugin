import { describe, expect, test } from "bun:test";
import { renderToString } from "react-dom/server";
import type { Timetable, TimetableEntry } from "@/muscat/api/types";
import { fakeClient } from "../fakeClient";
import { currentYearTerm } from "./period";
import { TimetableScreen } from "./TimetableScreen";

const client = fakeClient();

const entry = (o: Partial<TimetableEntry>): TimetableEntry => ({
  day: "月", period: 3, subject: "合成演習", teacher: "先生", room: "A101", campus: "有明", code: "0000000001", credits: 2, ...o,
});
const irregular = { code: "0010010203", subject: "仏教(自己を見つめる)", teacher: "佐竹 真城", room: "未使用", campus: "オンライン", credits: 2 };

const timetable: Timetable = {
  year: 2026,
  terms: [
    { term: 1, entries: [entry({})], credits: 9, irregular: [irregular] },
    { term: 2, entries: [], credits: null, irregular: [] },
    {
      term: 3,
      entries: [entry({ day: "火", period: 3, subject: "火曜の授業", room: "B202", code: "0000000002" }), entry({ day: "火", period: 4, subject: "火曜の授業", room: "B202", code: "0000000002" })],
      credits: null,
      irregular: [],
    },
    { term: 4, entries: [], credits: null, irregular: [] },
  ],
};

// 2026-10-27 は火曜
const tuesday = new Date(2026, 9, 27, 13, 30);

const render = (props: Partial<Parameters<typeof TimetableScreen>[0]>) =>
  renderToString(<TimetableScreen client={client} doc={document} year={2026} term={1} now={tuesday} {...props} />);
const ready = { status: "ready" as const, timetable };

test("授業あり: 科目名と教室が出る", () => {
  const html = render({ initial: ready });
  expect(html).toContain("合成演習");
  expect(html).toContain("A101");
});

test("授業なしの学期でも 1〜7 限の見出しと開始時刻、月〜土が出る", () => {
  const html = render({ term: 2, initial: ready });
  expect(html).not.toContain("合成演習");
  for (const l of ["月", "火", "水", "木", "金", "土", "1限", "7限", "8:50", "10:40", "13:10", "15:00", "16:50", "18:40", "20:20"]) expect(html).toContain(l);
});

test("今の年度・学期の火曜 13:30: 「火(今日)」と 3 限の見出し・授業が強調される", () => {
  const html = render({ term: 3, initial: ready });
  expect(html).toContain("火(今日)");
  expect(html).toMatch(/text-primary[^"]*"[^>]*><span[^>]*>3限/);
  expect(html).not.toMatch(/text-primary[^"]*"[^>]*><span[^>]*>2限/);
  expect(html).toContain("border-2 border-primary");
});

test("別の学期・別の年度を見ているとき: 今日も今の時限も出ない", () => {
  for (const html of [render({ term: 2, initial: ready }), render({ term: 3, initial: { status: "ready", timetable: { ...timetable, year: 2025 } } })]) {
    expect(html).not.toContain("(今日)");
    expect(html).not.toContain("border-2 border-primary");
  }
});

test("合計単位: credits があればそれ、null なら授業の単位の合計(コマは重複しない)", () => {
  expect(render({ term: 1, initial: ready })).toContain("合計 9.0 単位");
  expect(render({ term: 3, initial: ready })).toContain("合計 2.0 単位");
  const t = { ...timetable, terms: [{ ...timetable.terms[0]!, credits: null }, ...timetable.terms.slice(1)] };
  expect(render({ term: 1, initial: { status: "ready", timetable: t } })).toContain("合計 4.0 単位");
});

test("曜日・時限が決まっていない授業: あれば出て、無ければ帯ごと出ない", () => {
  const html = render({ term: 1, initial: ready });
  expect(html).toContain("曜日・時限が決まっていない授業");
  expect(html).toContain("仏教(自己を見つめる)");
  expect(html).toContain("オンライン、2.0 単位");
  expect(render({ term: 2, initial: ready })).not.toContain("曜日・時限が決まっていない授業");
});

test("続くコマは 1 枚: 教室と科目名が 1 回だけ", () => {
  const html = render({ term: 3, now: new Date(2026, 9, 25, 10, 0), initial: ready }); // 日曜: 曜日タブは月で、下の一覧には火曜が出ない
  expect(html.split("B202").length - 1).toBe(1);
  expect(html.split("火曜の授業").length - 1).toBe(1);
});

test("エラー: 文言が出る", () => {
  expect(render({ initial: { status: "error", error: "読み取れませんでした" } })).toContain("読み取れませんでした");
  expect(render({ initial: { status: "error", error: "MUSCAT が応答しません。しばらくして再読み込みしてください" } })).toContain("応答しません");
});

test("範囲外の年度が分かっているとき: そのボタンは押せず、理由が出る", () => {
  const html = render({ initial: { status: "ready", timetable, blocked: [2025] } });
  expect(html).toContain("これより前の年度はありません");
  expect(html).not.toContain("これより後の年度はありません");
  const tag = (label: string) => html.match(new RegExp(`<button[^>]*aria-label="${label}"[^>]*>`))![0];
  // クラス名の disabled: と区別するため、属性の disabled="" を見る
  expect(tag("前の年度")).toContain(' disabled=""');
  expect(tag("次の年度")).not.toContain(' disabled=""');
});

test("読み込み中は表示が出る", () => {
  expect(render({})).toContain("読み込んでいます");
});

describe("currentYearTerm", () => {
  test("学期は月で決まり、年度は 4 月始まり", () => {
    const f = (y: number, m: number, d: number) => currentYearTerm(new Date(y, m - 1, d));
    expect(f(2026, 4, 1)).toEqual({ year: 2026, term: 1 });
    expect(f(2026, 6, 15)).toEqual({ year: 2026, term: 2 });
    expect(f(2026, 10, 25)).toEqual({ year: 2026, term: 3 });
    expect(f(2026, 11, 20)).toEqual({ year: 2026, term: 3 });
    expect(f(2026, 12, 1)).toEqual({ year: 2026, term: 4 });
    expect(f(2027, 2, 1)).toEqual({ year: 2026, term: 4 });
  });
});
