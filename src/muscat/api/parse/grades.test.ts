import { expect, test } from "bun:test";
import { ParseError } from "../errors";
import { parseGrades } from "./grades";

const head = `<tr><th>印</th><th>科目</th><th>単位数</th><th>評価</th><th>GPA対象</th><th>GPA対象(年度毎)</th><th>年度</th><th>学期</th><th>教員氏名</th></tr>`;
const heading = (level: number, name: string) =>
  `<tr><td></td><td class="colTani kamokuLevel${level}">${name}</td><td class="colTani"></td><td class="colTani"></td><td class="colTani"></td><td class="colTani"></td><td class="colTani"></td><td class="colTani"></td><td class="colTani"></td></tr>`;
const course = (level: number, mark: string, name: string, credits: string, grade: string, year: string, term: string, teacher = "教員A") =>
  `<tr><td>${mark}</td><td class="colTani kamokuLevel${level}">${name}</td><td class="colTani">${credits}</td><td class="colTani">${grade}</td><td class="colTani">${grade ? "○" : ""}</td><td class="colTani"></td><td class="colTani">${year}</td><td class="colTani">${term}</td><td class="colTani">${teacher}</td></tr>`;

// 実機の構造: 見出し行 + 値の表が入れ子で入った 1 セルの行(入れ子の中の見出しは th、値の行は td)
const gpaTable = (title: string, rows: [string, string][]) =>
  `<table class="gpaListArea"><tr><th>${title}</th></tr><tr><td><table><tr><th></th><th>GPA</th></tr>${rows.map(([l, v]) => `<tr><td class="colNendoGakki">${l}</td><td class="colGpa">${v}</td></tr>`).join("")}</table></td></tr></table>`;
const creditRow = (level: number, name: string, ...nums: string[]) =>
  `<tr><td class="kamokuLevel${level}">${name}</td>${nums.map((n) => `<td>${n}</td>`).join("")}</tr>`;

const checks = (on: string[]) =>
  ["fail", "rishu", "muhaito", "furikae"].map((n) => `<input type="checkbox" name="funcForm:${n}DispFlg_input"${on.includes(n) ? " checked" : ""}>`).join("");

const page = (rows: string, extra = "", on = ["fail", "rishu", "muhaito", "furikae"]) =>
  `<form id="funcForm">${checks(on)}<div class="ui-panelgrid"><div>履修合計単位</div><div>24.0</div><div>合計単位(オンライン)</div><div>51.0</div></div>
  <table>${head}${rows}</table>${extra}</form>`;
const parse = (html: string) => parseGrades(new DOMParser().parseFromString(html, "text/html"));

test("見出しと授業の判定・depth・印・履修中", () => {
  const g = parse(
    page(
      heading(1, "教養") +
        heading(3, "基礎") +
        course(5, "", "合成演習", "2.0", "A", "2024", "1学期") +
        course(7, "*", "合成講義", "2.0", "S", "2024", "2学期") +
        course(5, "※", "履修中科目", "2.0", "", "2025", "3学期") +
        course(5, "※*", "履修中オンライン", "1.0", "", "2025", "3学期", "") +
        course(5, "□", "変な印", "", "D", "", "") ,
    ),
  );
  expect(g.entries.map((e) => [e.depth, e.name, e.course === null])).toEqual([
    [0, "教養", true],
    [1, "基礎", true],
    [2, "合成演習", false],
    [3, "合成講義", false],
    [2, "履修中科目", false],
    [2, "履修中オンライン", false],
    [2, "変な印", false],
  ]);
  const c = g.entries.filter((e) => e.course).map((e) => e.course!);
  expect(c[0]).toEqual({
    mark: "", online: false, inProgress: false, name: "合成演習", credits: 2, grade: "A",
    gpaTarget: true, gpaTargetYear: false, year: 2024, term: "1学期", teacher: "教員A",
  });
  expect(c[1]).toMatchObject({ mark: "*", online: true, inProgress: false, grade: "S" });
  expect(c[2]).toMatchObject({ mark: "※", online: false, inProgress: true, grade: "", gpaTarget: false });
  expect(c[3]).toMatchObject({ mark: "※*", online: true, inProgress: true, teacher: "" });
  expect(c[4]).toMatchObject({ mark: "□", online: false, inProgress: false, credits: null, year: null });
});

test("列は見出しのテキストで引く(GPA 系の列が無くても読める)", () => {
  const h = `<tr><th></th><th>科目</th><th>単位数</th><th>評価</th><th>年度</th><th>学期</th><th>教員氏名</th></tr>`;
  const r = `<tr><td>*</td><td class="kamokuLevel1">科目X</td><td>4.0</td><td>B</td><td>2023</td><td>1学期</td><td>教員B</td></tr>`;
  const g = parse(`<form id="funcForm"><table>${h}${r}</table></form>`);
  expect(g.entries[0]!.course).toMatchObject({ name: "科目X", credits: 4, grade: "B", year: 2023, teacher: "教員B", gpaTarget: false, online: true });
});

test("GPA 3 表・単位表・履修合計・表示条件", () => {
  const g = parse(
    page(
      course(1, "", "科目", "2.0", "A", "2024", "1学期"),
      gpaTable("年度学期GPA", [["2024年度 1学期", "2.87"], ["2024年度 2学期", ""]]) +
        gpaTable("年度GPA", [["2024年度", "2.87"], ["通算", "2.80"]]) +
        gpaTable("総合GPA", [["2024年度", "2.87"]]) +
        `<table><tr><th>科目分類</th><th>卒業要件単位</th><th>修得済単位</th><th>履修中単位</th><th>合計単位</th></tr>
         ${creditRow(1, "教養", "10.0", "8.0", "", "8.0")}${creditRow(3, "基礎", "", "4.0", "2.0", "6.0")}${creditRow(1, "総合計", "124.0", "50.0", "24.0", "74.0")}</table>`,
      ["fail", "furikae"],
    ),
  );
  expect(g.gpa.byTerm).toEqual([{ label: "2024年度 1学期", value: 2.87 }, { label: "2024年度 2学期", value: null }]);
  expect(g.gpa.byYear).toEqual([{ label: "2024年度", value: 2.87 }, { label: "通算", value: 2.8 }]);
  expect(g.gpa.cumulative).toEqual([{ label: "2024年度", value: 2.87 }]);
  expect(g.credits).toEqual([
    { depth: 0, name: "教養", required: 10, earned: 8, inProgress: null, total: 8 },
    { depth: 1, name: "基礎", required: null, earned: 4, inProgress: 2, total: 6 },
    { depth: 0, name: "総合計", required: 124, earned: 50, inProgress: 24, total: 74 },
  ]);
  expect(g.totals).toEqual({ inProgress: 24, online: 51 });
  expect(g.filter).toEqual({ fail: true, inProgress: false, noCredit: false, transfer: true });
});

test("GPA・単位・合計の表が無くても落ちない", () => {
  const g = parse(`<form id="funcForm"><table>${head}${course(1, "", "科目", "2.0", "A", "2024", "1学期")}</table></form>`);
  expect(g.gpa).toEqual({ byTerm: [], byYear: [], cumulative: [] });
  expect(g.credits).toEqual([]);
  expect(g.totals).toEqual({ inProgress: null, online: null });
  expect(g.filter).toEqual({ fail: false, inProgress: false, noCredit: false, transfer: false });
});

test("funcForm / 科目の表が無ければ ParseError", () => {
  expect(() => parse("<p>x</p>")).toThrow(ParseError);
  expect(() => parse(`<form id="funcForm"><table><tr><th>a</th></tr></table></form>`)).toThrow(ParseError);
});
