import { useEffect, useState } from "react";
import type { MuscatClient } from "@/muscat/api/client";
import type { GradeFilter, Grades } from "@/muscat/api/types";
import { errorMessage } from "../errorMessage";

export type GradesState = { status: "loading" | "ready" | "error"; grades?: Grades; error?: string };

/** initial はテスト用(effect が動かない描画で状態を固定する)。filter が undefined の間は、今の画面の条件のまま読む。 */
export function useGrades(client: MuscatClient, initial?: GradesState) {
  const [filter, setFilter] = useState<GradeFilter | undefined>(initial?.grades?.filter);
  const [state, setState] = useState<GradesState>(initial ?? { status: "loading" });

  useEffect(() => {
    let alive = true;
    // 前の結果は残したまま読み込み中にする(条件の切替で画面が白くならない)
    setState((s) => ({ status: "loading", grades: s.grades }));
    client.getGrades(filter).then(
      (grades) => alive && setState({ status: "ready", grades }),
      (e) => alive && setState((s) => ({ status: "error", grades: s.grades, error: errorMessage(e) })),
    );
    return () => {
      alive = false;
    };
  }, [client, filter]);

  return { ...state, setFilter };
}
