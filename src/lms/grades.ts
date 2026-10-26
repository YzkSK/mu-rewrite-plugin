import { courseName } from "@/portal/lib/lms";
import { LoginRequiredError } from "./api";

export type GradeCourse = { id: number; name: string; grade: string };
export type GradeItem = { name: string; kind: string; grade: string; percent: string; feedback: string; contrib: string };
export type GradeTotal = { grade: string; percent: string; contrib: string };
export type GradeDetail = { items: GradeItem[]; total: GradeTotal | null; showPercent: boolean; showContrib: boolean };

export const OVERVIEW_URL = "/grade/report/overview/index.php";
export const userUrl = (id: number): string => `/grade/report/user/index.php?id=${id}`;

const text = (el: Element | null | undefined): string => (el?.textContent ?? "").replace(/\s+/g, " ").trim();
const KINDS = ["課題", "小テスト", "フォーラム"];

/** 評点があるか(「-」だけ・空は無い) */
export const hasGrade = (c: GradeCourse): boolean => c.grade !== "" && c.grade !== "-";

/** 成績の一覧(table#overview-grade)。コース名のリンクから id、2 列目が評点 */
export function readGradeList(doc: Document): GradeCourse[] {
  const list: GradeCourse[] = [];
  for (const tr of doc.querySelectorAll("table#overview-grade tr")) {
    const cells = tr.querySelectorAll("th,td");
    const a = cells[0]?.querySelector("a");
    const id = Number(/[?&]id=(\d+)/.exec(a?.getAttribute("href") ?? "")?.[1]);
    if (!a || !id) continue; // 見出しの行
    list.push({ id, name: courseName(text(a)), grade: text(cells[1]) });
  }
  return list;
}

const quiet = (s: string): boolean => /^(-|0(\.0+)?\s*%)?$/.test(s.trim());

/** コースの評定(table.user-grade)。th.level2 が項目、「コース合計」の行は合計。コース名だけの行は飛ばす */
export function readGradeDetail(doc: Document): GradeDetail {
  const items: GradeItem[] = [];
  let total: GradeTotal | null = null;
  for (const tr of doc.querySelectorAll("table.user-grade tbody tr")) {
    const th = tr.querySelector("th");
    const tds = tr.querySelectorAll("td");
    if (!th || !tds.length) continue;
    const name = text(th);
    // 評点のセルには「 操作 評定分析」などが続くので、最初の空白より前だけ
    const cell = (i: number) => text(tds[i]);
    const grade = cell(0).split(" ")[0] ?? "";
    if (name.startsWith("コース合計")) total = { grade, percent: cell(1), contrib: cell(3) };
    else if (th.classList.contains("level2")) {
      const kind = KINDS.find((k) => name.startsWith(k)) ?? "";
      items.push({ name: name.slice(kind.length).trim(), kind, grade, percent: cell(1), feedback: cell(2), contrib: cell(3) });
    }
  }
  return { items, total, showPercent: items.some((i) => !quiet(i.percent)), showContrib: items.some((i) => !quiet(i.contrib)) };
}

async function fetchDoc(url: string): Promise<Document> {
  const r = await fetch(url, { credentials: "include" });
  if (!r.ok) throw new Error(`${url} ${r.status}`);
  if (r.url.includes("/login/")) throw new LoginRequiredError();
  return new DOMParser().parseFromString(await r.text(), "text/html");
}

export const loadGradeList = async (): Promise<GradeCourse[]> => {
  const doc = await fetchDoc(OVERVIEW_URL);
  if (!doc.querySelector("table#overview-grade")) throw new Error("成績の一覧が見つかりません");
  return readGradeList(doc);
};

export const loadGradeDetail = async (id: number): Promise<GradeDetail> => {
  const doc = await fetchDoc(userUrl(id));
  if (!doc.querySelector("table.user-grade")) throw new Error("評定の表が見つかりません");
  return readGradeDetail(doc);
};
