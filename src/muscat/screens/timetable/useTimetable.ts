import { useEffect, useState } from "react";
import type { MuscatClient } from "@/muscat/api/client";
import type { Timetable } from "@/muscat/api/types";
import { errorMessage } from "../errorMessage";

/** blocked: サーバーが受け付けず、別の年度に戻された年度(その学生の範囲の外) */
export type TimetableState = { status: "loading" | "ready" | "error"; timetable?: Timetable; error?: string; blocked?: number[] };

/** initial はテスト用(effect が動かない描画で状態を固定する)。 */
export function useTimetable(client: MuscatClient, year0: number, initial?: TimetableState) {
  const [year, setYear] = useState(year0);
  const [tries, setTries] = useState(0); // 再読み込みのたびに増やして effect をやり直す
  const [state, setState] = useState<TimetableState>(initial ?? { status: "loading" });

  useEffect(() => {
    let alive = true;
    // 前の時間割は残したまま読み込み中にする(年度切替で画面が白くならない)
    setState((s) => ({ status: "loading", timetable: s.timetable, blocked: s.blocked }));
    client.getTimetable(year).then(
      (timetable) => {
        if (!alive) return;
        // 範囲外の年度を頼むと、サーバーは別の年度に戻して返す。その年度は選べないものとして覚える
        const outOfRange = timetable.year !== year;
        setState((s) => ({ status: "ready", timetable, blocked: outOfRange ? [...(s.blocked ?? []), year] : s.blocked }));
        if (outOfRange) setYear(timetable.year);
      },
      (e) => {
        const error = errorMessage(e);
        if (alive && error) setState((s) => ({ status: "error", timetable: s.timetable, error, blocked: s.blocked })); // "" は画面を離れた印なので何も出さない
      },
    );
    return () => {
      alive = false;
    };
  }, [client, year, tries]);

  return { ...state, setYear, retry: () => setTries((n) => n + 1) };
}
