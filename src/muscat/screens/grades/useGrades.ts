import { useState } from "react";
import type { MuscatClient } from "@/muscat/api/client";
import type { GradeFilter, Grades } from "@/muscat/api/types";
import { useKeptLoad } from "../useKeptLoad";

export type GradesState = { status: "loading" | "ready" | "error"; grades?: Grades; error?: string };

/** initial はテスト用(effect が動かない描画で状態を固定する)。filter が undefined の間は、今の画面の条件のまま読む。 */
export function useGrades(client: MuscatClient, initial?: GradesState) {
  const [filter, setFilter] = useState<GradeFilter | undefined>(undefined);
  const { value, retry, ...rest } = useKeptLoad(
    () => client.getGrades(filter),
    [client, filter],
    initial && { status: initial.status, value: initial.grades, error: initial.error },
  );

  return { ...rest, grades: value, setFilter, retry };
}
