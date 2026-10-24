import type { Core } from "./core";
import { parseAttendance } from "./parse/attendance";
import type { Attendance } from "./types";

const SELECT = "funcForm:kaikoNendoGakki_input";
const RENDER = "funcForm:btnHyoji funcForm:conditionArea funcForm:jugyoKaisuInfo funcForm:jugyoKaisuTbl";

export const isReady = (d: Document) => !!d.querySelector(`#funcForm [name="${SELECT}"]`);
const currentTerm = (d: Document) => d.querySelector<HTMLSelectElement>(`[name="${SELECT}"]`)?.value;

export function getAttendance(core: Core, termKey?: string): Promise<Attendance> {
  return core.run(async (ctx) => {
    if (!(await ctx.open("出席確認", isReady))) return null;
    if (termKey !== undefined && termKey !== currentTerm(ctx.doc())) {
      const ok = await ctx.partial("funcForm", "funcForm:btnHyoji", { render: RENDER, extra: { [SELECT]: termKey } });
      if (!ok) return null;
    }
    return parseAttendance(ctx.doc());
  });
}
