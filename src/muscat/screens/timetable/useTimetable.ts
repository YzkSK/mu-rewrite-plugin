import { useEffect, useState } from "react";
import type { MuscatClient } from "@/muscat/api/client";
import { MuscatDownError, ParseError, SsoRequiredError } from "@/muscat/api/errors";
import type { Timetable } from "@/muscat/api/types";

export type TimetableState = { status: "loading" | "ready" | "error"; timetable?: Timetable; error?: string };

export function errorMessage(e: unknown): string {
  if (e instanceof ParseError) return "読み取れませんでした";
  if (e instanceof SsoRequiredError) return "ログインが切れました。MUSCAT にログインし直してください";
  if (e instanceof MuscatDownError) return "MUSCAT が応答しません。しばらくして再読み込みしてください";
  return "読み取れませんでした";
}

/** initial はテスト用(effect が動かない描画で状態を固定する)。 */
export function useTimetable(client: MuscatClient, year0: number, initial?: TimetableState) {
  const [year, setYear] = useState(year0);
  const [state, setState] = useState<TimetableState>(initial ?? { status: "loading" });

  useEffect(() => {
    let alive = true;
    // 前の時間割は残したまま読み込み中にする(年度切替で画面が白くならない)
    setState((s) => ({ status: "loading", timetable: s.timetable }));
    client.getTimetable(year).then(
      (timetable) => alive && setState({ status: "ready", timetable }),
      (e) => alive && setState({ status: "error", error: errorMessage(e) }),
    );
    return () => {
      alive = false;
    };
  }, [client, year]);

  return { ...state, setYear };
}
