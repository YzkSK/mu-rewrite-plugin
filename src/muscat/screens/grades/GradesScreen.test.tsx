import { expect, test } from "bun:test";
import { renderToString } from "react-dom/server";
import type { MuscatClient } from "@/muscat/api/client";
import type { GradeCourse, GradeEntry, Grades } from "@/muscat/api/types";
import { GradesScreen } from "./GradesScreen";
import { GradeList } from "./GradeList";

const never = () => new Promise<never>(() => {});
const client: MuscatClient = { getTimetable: never, getAttendance: never, getGrades: never };

const course = (o: Partial<GradeCourse>): GradeCourse => ({
  mark: "", online: false, inProgress: false, name: "科目", credits: 2, grade: "B", gpaTarget: true, gpaTargetYear: true,
  year: 2024, term: "1学期", teacher: "教員A", ...o,
});
const entries: GradeEntry[] = [
  { depth: 0, name: "教養分類", course: null },
  { depth: 1, name: "基礎分類", course: null },
  { depth: 2, name: "優秀科目", course: course({ name: "優秀科目", grade: "S" }) },
  { depth: 2, name: "不可科目", course: course({ name: "不可科目", grade: "D", year: 2023, term: "2学期" }) },
  { depth: 2, name: "履修中科目", course: course({ name: "履修中科目", grade: "", inProgress: true, mark: "※", year: 2025, term: "3学期" }) },
  { depth: 2, name: "オンライン科目", course: course({ name: "オンライン科目", online: true, mark: "*" }) },
];
const grades: Grades = {
  entries,
  gpa: {
    byTerm: [{ label: "2024年度 1学期", value: 2.87 }],
    byYear: [{ label: "2024年度", value: 2.87 }, { label: "通算", value: 2.8 }],
    cumulative: [{ label: "2023年度", value: 2.5 }, { label: "2024年度", value: 2.91 }],
  },
  credits: [{ depth: 0, name: "教養分類", required: 10, earned: 8, inProgress: null, total: 8 }],
  totals: { inProgress: 24, online: 51 },
  filter: { fail: true, inProgress: true, noCredit: true, transfer: true },
};
const render = (initial: Parameters<typeof GradesScreen>[0]["initial"]) => renderToString(<GradesScreen client={client} initial={initial} />);

test("要約: 総合GPAの最新と通算・年度GPA・履修合計単位・単位表", () => {
  const html = render({ status: "ready", grades });
  for (const s of ["2.91", "2.80", "2.87", "24.0", "51.0", "年度学期ごとのGPA", "単位の状況", "教養分類"]) expect(html).toContain(s);
});

test("一覧: 科目名・教員・履修中・分類ごとのインデント", () => {
  const html = render({ status: "ready", grades });
  for (const s of ["優秀科目", "教員A", "履修中", "オンライン", "基礎分類"]) expect(html).toContain(s);
  expect(html).toContain("padding-left:12px"); // depth 1 の見出し
  expect(html).toContain("padding-left:24px"); // depth 2 の授業
});

test("評価: S は強調、D は警告色、B は普通", () => {
  const s = renderToString(<GradeList entries={[entries[2]!]} view="category" />);
  expect(s).toContain("text-primary");
  expect(s).not.toContain("text-error");
  expect(renderToString(<GradeList entries={[entries[3]!]} view="category" />)).toContain("text-error");
  const b = renderToString(<GradeList entries={[{ depth: 0, name: "x", course: course({}) }]} view="category" />);
  expect(b).not.toContain("text-error");
  expect(b).not.toContain("text-primary");
});

test("年度学期ごと: 新しい年度学期が上", () => {
  const html = renderToString(<GradeList entries={entries} view="term" />);
  const at = (s: string) => html.indexOf(s);
  expect(at("2025年度 3学期")).toBeGreaterThan(-1);
  expect(at("2025年度 3学期")).toBeLessThan(at("2024年度 1学期"));
  expect(at("2024年度 1学期")).toBeLessThan(at("2023年度 2学期"));
  expect(html).not.toContain("基礎分類");
});

test("空・エラー・読み込み中", () => {
  expect(render({ status: "ready", grades: { ...grades, entries: [{ depth: 0, name: "見出しだけ", course: null }] } })).toContain("該当する科目はありません");
  expect(render({ status: "error", error: "MUSCAT が応答しません。しばらくして再読み込みしてください" })).toContain("応答しません");
  expect(render(undefined)).toContain("読み込み中");
});
