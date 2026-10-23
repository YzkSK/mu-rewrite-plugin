import type { Core } from "./core";
import { parseFilter } from "./parse/gradeSummary";
import { parseGrades } from "./parse/grades";
import type { GradeFilter, Grades } from "./types";

const CHECKS = {
  fail: "funcForm:failDispFlg_input",
  inProgress: "funcForm:rishuDispFlg_input",
  noCredit: "funcForm:muhaitoDispFlg_input",
  transfer: "funcForm:furikaeDispFlg_input",
} as const;

const isReady = (d: Document) => !!d.querySelector(`#funcForm [name="${CHECKS.fail}"]`);

export function getGrades(core: Core, filter?: GradeFilter): Promise<Grades> {
  return core.run(async (ctx) => {
    if (!(await ctx.open("成績照会", isReady))) return null;
    const form = ctx.doc().getElementById("funcForm");
    if (filter && form) {
      const now = parseFilter(form);
      const keys = Object.keys(CHECKS) as (keyof GradeFilter)[];
      if (keys.some((k) => filter[k] !== now[k])) {
        // チェックありは name=on、なしはその name を送らない(null)
        const extra = Object.fromEntries(keys.map((k) => [CHECKS[k], filter[k] ? "on" : null]));
        if (!(await ctx.partial("funcForm", "funcForm:search", { extra }))) return null;
      }
    }
    return parseGrades(ctx.doc());
  });
}
