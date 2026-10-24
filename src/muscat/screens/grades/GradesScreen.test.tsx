import { expect, test } from "bun:test";
import { renderToString } from "react-dom/server";
import type { GradeCourse, GradeEntry, Grades } from "@/muscat/api/types";
import { fakeClient } from "../fakeClient";
import { GradesScreen } from "./GradesScreen";

const client = fakeClient();
const doc = new DOMParser().parseFromString(`<form id="funcForm"><button id="funcForm:create" type="button">PDF</button></form>`, "text/html");

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
  credits: [{ depth: 0, name: "総合計", required: 10, earned: 8, inProgress: 4, total: 12 }, { depth: 0, name: "教養分類", required: 4, earned: 2, inProgress: 1, total: 3 }],
  totals: { inProgress: 24, online: 51 },
  filter: { fail: true, inProgress: true, noCredit: true, transfer: true },
};
const render = (initial: Parameters<typeof GradesScreen>[0]["initial"], extra: Partial<Parameters<typeof GradesScreen>[0]> = {}) =>
  renderToString(<GradesScreen client={client} doc={doc} initial={initial} {...extra} />);
const ready = { status: "ready", grades } as const;

test("数字の帯: 総合GPA(最新)・通算GPA・修得済単位・履修中単位", () => {
  const html = render(ready);
  for (const s of ["総合GPA(最新)", "2.91", "通算GPA", "2.80", "修得済単位", "8.0", "履修中単位", "4.0"]) expect(html).toContain(s);
});

test("分類ごとの表: 見出し・科目・単位・評価・年度・学期・教員、履修中と D の色", () => {
  const html = render(ready);
  for (const s of ["基礎分類", "優秀科目", "2.0", "2024", "1学期", "教員A", "履修中", "text-error", ">オンライン<"]) expect(html).toContain(s);
  for (const s of ["※", "* オンライン授業"]) expect(html).not.toContain(s); // 記号と注記は出さない
  expect(html).toContain("padding-left:42px"); // depth 2
});

test("年度学期ごと: 年度学期の見出しが新しい順に出て、分類の見出しは出ない", () => {
  const html = render(ready, { initialView: "term" });
  const at = (s: string) => html.indexOf(s);
  expect(at("2025年度 3学期")).toBeGreaterThan(-1);
  expect(at("2025年度 3学期")).toBeLessThan(at("2024年度 1学期"));
  expect(at("2024年度 1学期")).toBeLessThan(at("2023年度 2学期"));
  expect(html).not.toContain("基礎分類");
});

test("表示の設定は初めは閉じていて、開くと 6 つのチェックと「表示」", () => {
  expect(render(ready)).not.toContain("表示する列");
  const html = render(ready, { initialOpen: true });
  for (const s of ["表示する列", "GPA対象(年度毎)", "不合格科目", "履修中科目", "配当なし科目", "振替科目"]) expect(html).toContain(s);
  expect(html.match(/type="checkbox"/g)?.length).toBe(6);
  expect(html).toContain("表示</button>");
});

test("GPA対象の列を隠すと見出しから消える", () => {
  expect(render(ready)).toContain("GPA対象</th>");
  const html = render(ready, { initialCols: { gpa: false, gpaYear: true } });
  expect(html).not.toContain("GPA対象</th>");
  expect(html).toContain("GPA対象(年度毎)</th>");
});

test("PDF で出力のボタン", () => {
  expect(render(ready)).toContain("PDF で出力");
});

test("下の折りたたみ 3 つの見出し", () => {
  const html = render(ready);
  for (const s of ["GPA推移表", "単位修得状況", "履修合計単位・合計単位(オンライン)"]) expect(html).toContain(s);
});

test("空・エラー・読み込み中", () => {
  expect(render({ status: "ready", grades: { ...grades, entries: [{ depth: 0, name: "見出しだけ", course: null }] } })).toContain("該当する科目はありません");
  expect(render({ status: "error", error: "MUSCAT が応答しません。しばらくして再読み込みしてください" })).toContain("応答しません");
  expect(render(undefined)).toContain("読み込んでいます");
});
