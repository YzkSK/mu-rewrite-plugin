import { useEffect, useState } from "react";
import type { MuscatClient } from "@/muscat/api/client";
import type { DriveStep } from "@/muscat/api/driver/drive";
import { assignRef } from "@/muscat/api/driver/locator";
import type { GradeFilter, Grades } from "@/muscat/api/types";
import { errorMessage } from "../errorMessage";

export type GradesState = { status: "loading" | "ready" | "error"; grades?: Grades; error?: string };

const FLAGS: Record<keyof GradeFilter, string> = { fail: "fail", inProgress: "rishu", noCredit: "muhaito", transfer: "furikae" };

/**
 * 表示する科目の条件を、生きたページのチェックを押してから「表示」を押して変える手順。
 * チェックの値をフォームで送るだけではサーバーに伝わらない(チェックを押した時に伝わる。実機で確認)。部品が無ければ null
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

/** initial はテスト用(effect が動かない描画で状態を固定する)。filter が undefined の間は、今の画面の条件のまま読む。 */
export function useGrades(client: MuscatClient, doc: Document, initial?: GradesState) {
  const [filter, setFilter] = useState<GradeFilter | undefined>(undefined);
  const [state, setState] = useState<GradesState>(initial ?? { status: "loading" });

  useEffect(() => {
    let alive = true;
    // 前の結果は残したまま読み込み中にする(条件の切替で画面が白くならない)
    setState((s) => ({ status: "loading", grades: s.grades }));
    const steps = filter && filterSteps(doc, filter);
    (steps ? client.driveLive(steps).then(() => client.getGrades()) : client.getGrades()).then(
      (grades) => alive && setState({ status: "ready", grades }),
      (e) => alive && setState((s) => ({ status: "error", grades: s.grades, error: errorMessage(e) })),
    );
    return () => {
      alive = false;
    };
  }, [client, doc, filter]);

  return { ...state, setFilter };
}
