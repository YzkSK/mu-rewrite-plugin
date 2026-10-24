import { expect, test } from "bun:test";
import { renderToString } from "react-dom/server";
import type { Attendance } from "@/muscat/api/types";
import { fakeClient } from "../fakeClient";
import { AttendanceScreen } from "./AttendanceScreen";

const client = fakeClient();

const terms = [2019, 2020, 2025, 2026, 2027, 2028].map((y) => ({ key: `${y}|03`, label: `${y}年度 3学期` }));
const base: Attendance = { termKey: "2026|03", baseDate: "2026/10/24", terms, courses: [] };
const withCourse = (marks: Attendance["courses"][0]["sessions"]): Attendance => ({
  ...base,
  courses: [{ when: "火2 火3", code: "5300100033", subject: "合成演習", teacher: "教員A", rate: 66.7, sessions: marks }],
});
const render = (initial: Parameters<typeof AttendanceScreen>[0]["initial"]) =>
  renderToString(<AttendanceScreen client={client} doc={document} initial={initial} />);

test("カード: 科目名・教員・曜日時限・出席率・印と日付", () => {
  const html = render({
    status: "ready",
    attendance: withCourse([
      { kind: "present", label: "出", date: "10/06" },
      { kind: "none", label: "", date: "10/13" },
    ]),
  });
  for (const s of ["合成演習", "教員A", "火2 火3", "66.7", "出", "10/06", "10/13"]) expect(html).toContain(s);
});

test("欠席だけ警告色", () => {
  const ok = render({
    status: "ready",
    attendance: withCourse([
      { kind: "present", label: "出", date: "10/06" },
      { kind: "late", label: "遅", date: "10/13" },
    ]),
  });
  expect(ok).not.toContain("text-error");
  const ng = render({ status: "ready", attendance: withCourse([{ kind: "absent", label: "欠", date: "10/06" }]) });
  expect(ng).toContain("text-error");
});

test("授業 0 件", () => {
  expect(render({ status: "ready", attendance: base })).toContain("この学期の授業はありません");
});

test("学期の選択肢は選択年度の 5 年前〜1 年後に絞る", () => {
  const html = render({ status: "ready", attendance: base });
  for (const y of [2025, 2026, 2027]) expect(html).toContain(`${y}年度 3学期`);
  for (const y of [2019, 2020, 2028]) expect(html).not.toContain(`${y}年度 3学期`);
});

test("エラーと読み込み中", () => {
  expect(render({ status: "error", error: "MUSCAT が応答しません。しばらくして再読み込みしてください" })).toContain("応答しません");
  expect(render(undefined)).toContain("読み込んでいます");
});
