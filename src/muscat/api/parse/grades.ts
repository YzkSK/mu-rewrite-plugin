import { ParseError } from "../errors";
import type { GradeEntry, Grades } from "../types";
import { depthOf, headerOf, num, tds } from "./gradeCells";
import { parseSummary } from "./gradeSummary";

/** 科目の表: 見出し行の 2 番目が「科目」、3 番目が「単位数」 */
const isCourseTable = (t: Element) => {
  const h = headerOf(t);
  return h[1] === "科目" && h[2] === "単位数";
};

export function parseGrades(root: ParentNode): Grades {
  const form = root.querySelector("#funcForm");
  if (!form) throw new ParseError("funcForm がありません");
  const table = [...form.querySelectorAll("table")].find(isCourseTable);
  if (!table) throw new ParseError("科目の表がありません");

  const h = headerOf(table);
  const col = (name: string) => h.indexOf(name);
  const markCol = Math.max(col("印"), 0);
  const entries = [...table.querySelectorAll("tr")].flatMap((tr): GradeEntry[] => {
    const c = tds(tr);
    const nameCell = c[1];
    if (!nameCell) return []; // 見出し行(th)など
    const cell = (name: string) => (c[col(name)]?.textContent ?? "").trim();
    const mark = (c[markCol]?.textContent ?? "").trim();
    const grade = cell("評価");
    const credits = cell("単位数");
    const year = cell("年度");
    const name = (nameCell.textContent ?? "").trim();
    const depth = depthOf(nameCell);
    // 行は .colTani を全部持つので、セルの有無ではなく中身で見出しと授業を分ける
    if (!grade && !credits && !year) return [{ depth, name, course: null }];
    return [
      {
        depth,
        name,
        course: {
          mark,
          online: mark.includes("*"),
          inProgress: mark.includes("※"),
          name,
          credits: num(credits),
          grade,
          gpaTarget: cell("GPA対象") !== "",
          gpaTargetYear: cell("GPA対象(年度毎)") !== "",
          year: num(year),
          term: cell("学期"),
          teacher: cell("教員氏名"),
        },
      },
    ];
  });
  return { entries, ...parseSummary(form) };
}
