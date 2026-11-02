import { useState } from "react";
import type { MuscatClient } from "@/muscat/api/client";
import type { Attendance } from "@/muscat/api/types";
import { useKeptLoad } from "../useKeptLoad";

export type AttendanceState = { status: "loading" | "ready" | "error"; attendance?: Attendance; error?: string };

/** initial はテスト用(effect が動かない描画で状態を固定する)。termKey / baseDate が undefined の間は、今開いている値を読む。 */
export function useAttendance(client: MuscatClient, initial?: AttendanceState) {
  const [termKey, setTermKey] = useState<string | undefined>(initial?.attendance?.termKey);
  const [baseDate, setBaseDate] = useState<string | undefined>();
  const { value, retry, ...rest } = useKeptLoad(
    () => client.getAttendance(termKey, baseDate),
    [client, termKey, baseDate],
    initial && { status: initial.status, value: initial.attendance, error: initial.error },
  );

  return { ...rest, attendance: value, setTermKey, setBaseDate, retry };
}
