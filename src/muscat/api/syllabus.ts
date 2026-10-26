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
