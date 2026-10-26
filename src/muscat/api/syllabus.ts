import type { Core } from "./core";
import type { DriveStep } from "./driver/drive";
import { ParseError } from "./errors";
import { parseSyllabus } from "./parse/syllabus";
import type { SyllabusPage } from "./types";

type Group = "days" | "grades" | "kinds" | "periods";
const GROUPS: Group[] = ["days", "grades", "kinds", "periods"];
const FIELDS = ["year", "term", "subject", "teacher", "keyword", "dept", "category", "campus"] as const;

/** 検索の条件。省略した欄は set せず、省略したグループのチェックは押さない */
export type SyllabusQuery = Partial<Record<(typeof FIELDS)[number], string>> & { picked?: Partial<Record<Group, string[]>> };

/** 生きたページのシラバス検索(条件の欄と、検索後の一覧)を読む */
export const readSyllabus = (core: Core): Promise<SyllabusPage> => core.runLive(async (live) => parseSyllabus(live.doc));

/** 条件を元の画面の部品に入れて検索を押す(見つからない部品は飛ばす)。チェックは違うものだけ押す。ref は同じ複製を読み直して取る */
export const searchSyllabus = (core: Core, q: SyllabusQuery): Promise<void> =>
  core.runLive(async (live) => {
    const p = parseSyllabus(live.doc);
    if (!p.searchRef) throw new ParseError("シラバスの検索ボタンがありません");
    const steps: DriveStep[] = [
      ...FIELDS.flatMap((k): DriveStep[] => (q[k] !== undefined && p[k].ref ? [{ kind: "set", ref: p[k].ref, value: q[k] }] : [])),
      ...GROUPS.flatMap((g) => {
        const picked = q.picked?.[g];
        return picked ? p[g].filter((o) => o.ref && picked.includes(o.label) !== o.checked).map((o): DriveStep => ({ kind: "click", ref: o.ref })) : [];
      }),
      { kind: "click", ref: p.searchRef },
    ];
    await live.drive(steps);
  });

export type SyllabusTarget = { title: string; code?: string };

/** 検索結果から開く行を選ぶ: code 一致を先に、無ければ title が一致する行が 1 つだけのとき */
const pickRow = (p: SyllabusPage, c: SyllabusTarget) => {
  const rows = p.result?.rows ?? [];
  const byCode = c.code ? rows.find((r) => r.code === c.code) : undefined;
  if (byCode) return byCode;
  const byTitle = rows.filter((r) => r.title === c.title);
  return byTitle.length === 1 ? byTitle[0] : undefined;
};

/** 授業名で検索し、その授業の詳細を開く。学期が絞られて出ないときは学期を「すべて」にしてもう一度 */
export async function findAndOpenSyllabus(core: Core, course: SyllabusTarget): Promise<void> {
  await core.runLive(async (live) => {
    const p = parseSyllabus(live.doc);
    if (p.clearRef) await live.drive([{ kind: "click", ref: p.clearRef }]); // 前の検索の曜日・時限などを消す
  });
  await searchSyllabus(core, { subject: course.title });
  const open = (): Promise<boolean> =>
    core.runLive(async (live) => {
      const row = pickRow(parseSyllabus(live.doc), course);
      if (!row) return false;
      await live.drive([{ kind: "click", ref: row.openRef }]);
      return true;
    });
  if (await open()) return;
  const p = await readSyllabus(core);
  if (p.term.value !== "" && p.term.options.some((o) => o.value === "")) {
    await searchSyllabus(core, { subject: course.title, term: "" });
    if (await open()) return;
  }
  throw new ParseError("シラバスが見つかりませんでした");
}
