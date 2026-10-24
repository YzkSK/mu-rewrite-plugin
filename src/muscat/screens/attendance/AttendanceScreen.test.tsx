import { expect, test } from "bun:test";
import { renderToString } from "react-dom/server";
import type { Attendance, AttendanceCourse, AttendanceMark } from "@/muscat/api/types";
import { fakeClient } from "../fakeClient";
import { AttendanceScreen, termOptions } from "./AttendanceScreen";

const client = fakeClient();

const terms = [2019, 2020, 2025, 2026, 2027, 2028].map((y) => ({ key: `${y}|03`, label: `${y}年度 3学期` }));
const base: Attendance = { termKey: "2026|03", baseDate: "2026/10/25", terms, courses: [] };
const present: AttendanceMark = { kind: "present", label: "出", date: "10/06" };
const absent: AttendanceMark = { kind: "absent", label: "欠", date: "10/13" };
const course = (subject: string, sessions: AttendanceMark[], rate: number | null = 85.7): AttendanceCourse => ({
  when: "火2 火3",
  code: "5300100033",
  subject,
  teacher: "教員A",
  rate,
  sessions,
});
const withCourses = (courses: AttendanceCourse[]): Attendance => ({ ...base, courses });
const render = (initial: Parameters<typeof AttendanceScreen>[0]["initial"]) =>
  renderToString(<AttendanceScreen client={client} doc={document} initial={initial} />);
const ready = (courses: AttendanceCourse[]) => render({ status: "ready", attendance: withCourses(courses) });
// 凡例の「欠」の印は bg-error / text-error-foreground を持つので、赤い文字の確認では外す
const errorText = (html: string) => html.replaceAll("text-error-foreground", "");

test("基準日は日付の選び方の欄に出る", () => {
  const html = render({ status: "ready", attendance: base });
  expect(html).toContain("2026/10/25");
  expect(html).toContain('aria-label="出席率基準日"');
});

test("学期の選択肢は選択年度の 5 年前〜1 年後に絞る", () => {
  expect(termOptions(base).map((o) => o.value)).toEqual(["2025|03", "2026|03", "2027|03"]);
});

test("欠席のある授業の数と全授業数、チップは欠席の多い順", () => {
  const html = ready([
    course("科目A", [absent, present]),
    course("科目B", [absent, { ...absent, date: "10/20" }]),
    course("科目C", [present]),
  ]);
  expect(html).toContain("欠席のある授業");
  expect(html).toContain("全 3 授業のうち");
  const chips = html.slice(html.indexOf("全 3 授業のうち"));
  expect(chips.indexOf("科目B")).toBeLessThan(chips.indexOf("科目A"));
  expect(chips).toContain("欠 2");
  expect(chips).toContain("欠 1");
});

test("欠席が 0 件なら「欠席はありません」だけで、赤い文字は出ない", () => {
  const html = ready([course("科目A", [present, { kind: "late", label: "遅", date: "10/13" }])]);
  expect(html).toContain("欠席はありません");
  expect(errorText(html)).not.toContain("text-error");
});

test("凡例 7 種", () => {
  const html = ready([course("科目A", [present])]);
  for (const s of ["出席", "早退", "遅刻", "欠席", "公欠", "休講", "授業対象外"]) expect(html).toContain(s);
});

test("表: 回の列は最大回数まで、セルに日付と印、出席率", () => {
  const html = ready([course("科目A", [present, absent, present]), course("科目B", [present])]);
  for (const s of ["1回", "2回", "3回", "10/06", "10/13", "85.7%", "曜日時限", "授業科目", "出席率", "科目A", "教員A"]) expect(html).toContain(s);
  expect(html).not.toContain("4回");
});

test("PDF / Excel ボタン(生きたページに無ければ押せない)", () => {
  const html = ready([]);
  expect(html).toContain("PDF で出力");
  expect(html).toContain("Excel で出力");
  expect(html).toContain("disabled");
});

test("授業 0 件", () => {
  expect(render({ status: "ready", attendance: base })).toContain("この学期の授業はありません");
});

test("エラーと読み込み中", () => {
  expect(render({ status: "error", error: "MUSCAT が応答しません。しばらくして再読み込みしてください" })).toContain("応答しません");
  expect(render(undefined)).toContain("読み込んでいます");
});
