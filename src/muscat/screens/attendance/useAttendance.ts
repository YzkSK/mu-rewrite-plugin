import { useEffect, useState } from "react";
import type { MuscatClient } from "@/muscat/api/client";
import type { Attendance } from "@/muscat/api/types";
import { errorMessage } from "../errorMessage";

export type AttendanceState = { status: "loading" | "ready" | "error"; attendance?: Attendance; error?: string };

/** initial はテスト用(effect が動かない描画で状態を固定する)。termKey / baseDate が undefined の間は、今開いている値を読む。 */
export function useAttendance(client: MuscatClient, initial?: AttendanceState) {
  const [termKey, setTermKey] = useState<string | undefined>(initial?.attendance?.termKey);
  const [baseDate, setBaseDate] = useState<string | undefined>();
  const [tries, setTries] = useState(0); // 再読み込みのたびに増やして effect をやり直す
  const [state, setState] = useState<AttendanceState>(initial ?? { status: "loading" });

  useEffect(() => {
    let alive = true;
    // 前の結果は残したまま読み込み中にする(学期の切替で画面が白くならない)
    setState((s) => ({ status: "loading", attendance: s.attendance }));
    client.getAttendance(termKey, baseDate).then(
      (attendance) => alive && setState({ status: "ready", attendance }),
      (e) => {
        const error = errorMessage(e);
        if (alive && error) setState((s) => ({ status: "error", attendance: s.attendance, error })); // "" は画面を離れた印なので何も出さない
      },
    );
    return () => {
      alive = false;
    };
  }, [client, termKey, baseDate, tries]);

  return { ...state, setTermKey, setBaseDate, retry: () => setTries((n) => n + 1) };
}
