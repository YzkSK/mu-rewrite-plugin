import type { Core } from "./core";
import { parseTimetable } from "./parse/timetable";
import type { Timetable } from "./types";

const hasTimetable = (d: Document) =>
  !!d.querySelector("#funcForm") && !!d.querySelector('table[class*="classTable"]');
const currentYear = (d: Document) =>
  Number(d.querySelector<HTMLInputElement>('[name="funcForm:nendo_input"]')?.value);

export function getTimetable(core: Core, year?: number): Promise<Timetable> {
  return core.aside(async (ctx) => {
    if (!(await ctx.open("学生時間割表", hasTimetable))) return null;
    if (year !== undefined && year !== currentYear(ctx.doc())) {
      const ok = await ctx.partial("funcForm", "funcForm:search", {
        extra: { "funcForm:nendo_input": String(year) },
      });
      if (!ok) return null;
    }
    return parseTimetable(ctx.doc());
  });
}
