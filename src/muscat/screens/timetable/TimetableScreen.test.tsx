import { expect, test } from "bun:test";
import { renderToString } from "react-dom/server";
import type { MuscatClient } from "@/muscat/api/client";
import type { Timetable } from "@/muscat/api/types";
import { TimetableScreen } from "./TimetableScreen";

const never = () => new Promise<never>(() => {});
const client: MuscatClient = { getTimetable: never, getAttendance: never, getGrades: never };

const timetable: Timetable = {
  year: 2026,
  terms: [
    { term: 1, entries: [{ day: "月", period: 3, subject: "合成演習", teacher: "先生", room: "A101", campus: "有明", code: "0000000001", credits: 2 }] },
    { term: 2, entries: [] },
    { term: 3, entries: [] },
    { term: 4, entries: [] },
  ],
};

const render = (props: Partial<Parameters<typeof TimetableScreen>[0]>) =>
  renderToString(<TimetableScreen client={client} year={2026} term={1} {...props} />);

test("授業あり: 科目名と教室が出る", () => {
  const html = render({ initial: { status: "ready", timetable } });
  expect(html).toContain("合成演習");
  expect(html).toContain("A101");
});

test("授業なしの学期: 空でも 1〜6 限・月〜土・昼休みの見出しは出る", () => {
  const html = render({ term: 2, initial: { status: "ready", timetable } });
  expect(html).not.toContain("合成演習");
  for (const l of ["月", "火", "水", "木", "金", "土", "1限", "6限", "昼休み"]) expect(html).toContain(l);
});

test("エラー: 文言が出る", () => {
  expect(render({ initial: { status: "error", error: "読み取れませんでした" } })).toContain("読み取れませんでした");
  expect(render({ initial: { status: "error", error: "MUSCAT が応答しません。しばらくして再読み込みしてください" } })).toContain("応答しません");
});

test("範囲外の年度が分かっているとき: そのボタンは押せず、理由が出る", () => {
  const html = render({ initial: { status: "ready", timetable, blocked: [2025] } });
  expect(html).toContain("これより前の年度はありません");
  expect(html).not.toContain("これより後の年度はありません");
  // クラス名の disabled: と区別するため、属性の disabled="" を見る
  expect(/ disabled=""[^>]*>前の年度/.test(html)).toBe(true);
  expect(/ disabled=""[^>]*>次の年度/.test(html)).toBe(false);
});

test("読み込み中は表示が出る", () => {
  expect(render({})).toContain("読み込み中");
});
