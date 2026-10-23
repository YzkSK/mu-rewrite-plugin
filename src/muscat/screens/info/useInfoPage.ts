import { useEffect, useState } from "react";
import type { InfoPage } from "@/muscat/api/types";
import { errorMessage } from "../errorMessage";

export type InfoState = { status: "loading" | "ready" | "error"; page?: InfoPage; error?: string };

/** initial はテスト用(effect が動かない描画で状態を固定する) */
export function useInfoPage(load: () => Promise<InfoPage>, initial?: InfoState): InfoState {
  const [state, setState] = useState<InfoState>(initial ?? { status: "loading" });
  useEffect(() => {
    let alive = true;
    load().then(
      (page) => alive && setState({ status: "ready", page }),
      (e) => alive && setState({ status: "error", error: errorMessage(e) }),
    );
    return () => {
      alive = false;
    };
    // load は毎回作られる関数なので依存に入れない(画面を開いたときの 1 回だけ読む)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return state;
}
