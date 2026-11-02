import { useEffect, useState } from "react";
import { errorMessage } from "./errorMessage";

export type KeptState<T> = { status: "loading" | "ready" | "error"; value?: T; error?: string };

/**
 * deps が変わるたび(と retry のたび)に load を呼び直す。読み込み中・失敗のあいだも前の結果は残す(切替で画面が白くならない)。
 * initial はテスト用(effect が動かない描画で状態を固定する)。
 */
export function useKeptLoad<T>(load: () => Promise<T>, deps: readonly unknown[], initial?: KeptState<T>) {
  const [tries, setTries] = useState(0); // 再読み込みのたびに増やして effect をやり直す
  const [state, setState] = useState<KeptState<T>>(initial ?? { status: "loading" });

  useEffect(() => {
    let alive = true;
    setState((s) => ({ status: "loading", value: s.value }));
    load().then(
      (value) => alive && setState({ status: "ready", value }),
      (e) => {
        const error = errorMessage(e);
        if (alive && error) setState((s) => ({ status: "error", value: s.value, error })); // "" は画面を離れた印なので何も出さない
      },
    );
    return () => {
      alive = false;
    };
    // load は毎回作られる関数なので依存に入れない。読み直す条件は呼び出し側が deps で渡す
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tries]);

  return { ...state, retry: () => setTries((n) => n + 1) };
}
