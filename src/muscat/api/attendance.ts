import type { Core } from "./core";
import { findExportButton, type ExportKind } from "./exportForm";
import { parseAttendance } from "./parse/attendance";
import type { Attendance } from "./types";

const EXPORTS: ExportKind[] = ["PDF", "Excel"];

const SELECT = "funcForm:kaikoNendoGakki_input";
const DATE = "funcForm:baseDate1:baseDate1_input";
const RENDER = "funcForm:btnHyoji funcForm:conditionArea funcForm:jugyoKaisuInfo funcForm:jugyoKaisuTbl";

export const isReady = (d: Document) => !!d.querySelector(`#funcForm [name="${SELECT}"]`);
const currentTerm = (d: Document) => d.querySelector<HTMLSelectElement>(`[name="${SELECT}"]`)?.value;

const currentDate = (d: Document) => d.querySelector<HTMLInputElement>(`[name="${DATE}"]`)?.value;

export function getAttendance(core: Core, termKey?: string, baseDate?: string): Promise<Attendance> {
  return core.aside(async (ctx) => {
    if (!(await ctx.open("出席確認", isReady))) return null;
    const term = currentTerm(ctx.doc());
    const date = currentDate(ctx.doc());
    if ((termKey !== undefined && termKey !== term) || (baseDate !== undefined && baseDate !== date)) {
      const ok = await ctx.partial("funcForm", "funcForm:btnHyoji", {
        render: RENDER,
        extra: { [SELECT]: termKey ?? term ?? "", [DATE]: baseDate ?? date ?? "" },
      });
      if (!ok) return null;
    }
    const doc = ctx.doc();
    return { ...parseAttendance(doc), exports: EXPORTS.filter((t) => !!findExportButton(doc, t)) };
  });
}
