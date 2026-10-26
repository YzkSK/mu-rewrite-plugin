import { useEffect, useRef } from "react";
import { pushEntry } from "../shell/history";

/** いま開いている sub エントリの数。シェルが、持ち主の消えた sub エントリを飛ばすのに使う */
export const subs = { open: 0 };

/**
 * 画面の中の詳細などを開いている間、履歴に 1 つ積み、ブラウザの戻るで close を呼ぶ。
 * 画面の操作で閉じたときは history.back() で積んだ分を戻す。画面ごと消えた(アンマウント)ときは戻さない
 * (積んだ分は残るが、シェルが持ち主のいない sub エントリを飛ばす)
 */
export function useBackClose(open: boolean, close: () => void): void {
  const closeRef = useRef(close);
  closeRef.current = close;
  const gone = useRef(false);
  useEffect(() => () => void (gone.current = true), []); // 下の後始末より先に動かすため、先に置く
  useEffect(() => {
    if (!open) return;
    pushEntry({ mu: "sub" });
    let pushed = true;
    subs.open++;
    const onPop = (e: PopStateEvent) => {
      if ((e.state as { mu?: string } | null)?.mu === "sub") return;
      pushed = false; // 戻る操作で、積んだ分はもう無い
      closeRef.current();
    };
    window.addEventListener("popstate", onPop);
    return () => {
      window.removeEventListener("popstate", onPop);
      subs.open--;
      if (!pushed || gone.current) return;
      try {
        history.back();
      } catch {
        /* 履歴を触れなくても動く */
      }
    };
  }, [open]);
}
