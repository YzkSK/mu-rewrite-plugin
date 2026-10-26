import type { Core } from "./core";
import { ParseError } from "./errors";
import type { DriveStep } from "./driver/drive";
import { assignRef } from "./driver/locator";
import { findExportButton, type ExportKind } from "./exportForm";
import { parseGrades } from "./parse/grades";
import type { GradeFilter, Grades } from "./types";

const FLAGS: Record<keyof GradeFilter, string> = { fail: "fail", inProgress: "rishu", noCredit: "muhaito", transfer: "furikae" };

/**
 * 表示する科目の条件を、複製のチェックを押してから「表示」を押して変える手順。
 * 元の画面と同じく、チェックは通信なしで切り替え、「表示」の ab だけを送る(本文は 2026-10-26 の実機の記録と一致)。
 * ctx.partial で値だけ入れて送る方法では条件が伝わらなかった。部品が無ければ null
 */
export function filterSteps(doc: Document, filter: GradeFilter): DriveStep[] | null {
  const search = doc.getElementById("funcForm:search");
  if (!search) return null;
  const steps: DriveStep[] = [];
  for (const [k, n] of Object.entries(FLAGS) as [keyof GradeFilter, string][]) {
    const input = doc.querySelector<HTMLInputElement>(`input[name="funcForm:${n}DispFlg_input"]`);
    const box = input?.closest(".ui-chkbox")?.querySelector(".ui-chkbox-box");
    if (!input || !box) return null;
    if (input.checked !== filter[k]) steps.push({ kind: "click", ref: assignRef(box), ajax: false });
  }
  return [...steps, { kind: "click", ref: assignRef(search), ajax: true }];
}

const isReady = (d: Document) => !!d.querySelector(`#funcForm [name="funcForm:failDispFlg_input"]`);

export async function getGrades(core: Core, filter?: GradeFilter): Promise<Grades> {
  if (filter) {
    await core.runLive(async (live) => {
      const steps = filterSteps(live.doc, filter);
      // 条件は見せている成績照会の画面の状態なので、別の画面では黙って無視せずに知らせる
      if (!steps) throw new ParseError("成績照会の画面ではないため、表示する科目を変えられません");
      await live.drive(steps);
    });
  }
  return core.aside(async (ctx) => {
    if (!(await ctx.open("成績照会", isReady))) return null;
    const doc = ctx.doc();
    const exports: ExportKind[] = (["PDF", "Excel"] as const).filter((t) => !!findExportButton(doc, t));
    return { ...parseGrades(doc), exports };
  });
}
