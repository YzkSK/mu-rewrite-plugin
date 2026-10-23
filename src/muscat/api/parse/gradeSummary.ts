import type { CreditRow, GpaRow, GradeFilter, Grades } from "../types";
import { depthOf, headerOf, num, squash, tds } from "./gradeCells";

/** 見出しだけのテーブルの、次のテーブルが値。行は ラベル と GPA の 2 セル */
function gpaRows(tables: Element[], title: string): GpaRow[] {
  const i = tables.findIndex((t) => squash(t.textContent) === title);
  const next = i < 0 ? undefined : tables[i + 1];
  if (!next) return [];
  return [...next.querySelectorAll("tr")].flatMap((tr) => {
    const c = tds(tr);
    if (c.length < 2 || squash(c[1]!.textContent) === "GPA") return [];
    return [{ label: (c[0]!.textContent ?? "").trim(), value: num(c[1]!.textContent) }];
  });
}

function creditRows(tables: Element[]): CreditRow[] {
  const table = tables.find((t) => headerOf(t)[1] === "卒業要件単位");
  if (!table) return [];
  const h = headerOf(table);
  const at = (c: Element[], name: string) => num(c[h.indexOf(name)]?.textContent);
  return [...table.querySelectorAll("tr")].flatMap((tr) => {
    const c = tds(tr);
    if (c.length < 2) return [];
    return [
      {
        depth: depthOf(c[0]),
        name: (c[0]!.textContent ?? "").trim(),
        required: at(c, "卒業要件単位"),
        earned: at(c, "修得済単位"),
        inProgress: at(c, "履修中単位"),
        total: at(c, "合計単位"),
      },
    ];
  });
}

function totals(form: Element): Grades["totals"] {
  const grid = [...form.querySelectorAll('[class*="panelgrid"]')].find((e) => (e.textContent ?? "").includes("履修合計単位"));
  const t = squash(grid?.textContent);
  const pick = (re: RegExp) => num(re.exec(t)?.[1]);
  return { inProgress: pick(/履修合計単位([\d.]+)/), online: pick(/合計単位\(オンライン\)([\d.]+)/) };
}

export function parseFilter(form: Element): GradeFilter {
  const on = (n: string) => !!form.querySelector<HTMLInputElement>(`input[name="funcForm:${n}DispFlg_input"]`)?.checked;
  return { fail: on("fail"), inProgress: on("rishu"), noCredit: on("muhaito"), transfer: on("furikae") };
}

export function parseSummary(form: Element): Pick<Grades, "gpa" | "credits" | "totals" | "filter"> {
  const tables = [...form.querySelectorAll("table")];
  return {
    gpa: {
      byTerm: gpaRows(tables, "年度学期GPA"),
      byYear: gpaRows(tables, "年度GPA"),
      cumulative: gpaRows(tables, "総合GPA"),
    },
    credits: creditRows(tables),
    totals: totals(form),
    filter: parseFilter(form),
  };
}
