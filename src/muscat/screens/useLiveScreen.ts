import { useCallback, useEffect, useRef, useState } from "react";
import type { MuscatClient } from "@/muscat/api/client";
import { errorToast } from "@/ui/Toast";
import { errorMessage } from "./errorMessage";

export type LiveState<T> = { status: "loading" | "ready" | "error"; page?: T; error?: string; busy?: boolean };

/**
 * 複製の document を read で読み、操作(run)のあとに読み直す。操作中は前の結果を残す。
 * 複製は自分の通信でしか変わらないので、書き換えの見張りはしない。
 * read は呼び出し側のモジュール直下の定数にする(effect の依存になる)。initial はテスト用。
 */
export function useLiveScreen<T>(client: MuscatClient, read: (c: MuscatClient) => Promise<T>, initial?: LiveState<T>) {
  const [state, setState] = useState<LiveState<T>>(initial ?? { status: "loading" });
  const latest = useRef(state);
  latest.current = state;
  const load = useCallback(
    () =>
      read(client).then(
        (page) => setState((s) => ({ status: "ready", page, busy: s.busy })),
        (e) => {
          const error = errorMessage(e);
          if (error) setState((s) => ({ ...s, status: "error", error })); // "" は画面を離れた印なので何も出さない
        },
      ),
    [client, read],
  );
  const retry = useCallback(() => {
    setState((s) => ({ ...s, status: "loading" }));
    return load();
  }, [load]);
  useEffect(() => {
    void load();
  }, [load]);
  const run = useCallback(
    /** 成功したかを返す(失敗したら続きの処理をしない)。op は API の操作名を呼ぶ関数 */
    async (op: (c: MuscatClient) => Promise<unknown>, after?: () => Promise<void>, fail = "操作できませんでした"): Promise<boolean> => {
      setState((s) => ({ ...s, busy: true }));
      try {
        await op(client);
        await after?.(); // 元の部品を押さず直接送る通信(op のあと、読み直しの前)
      } catch (e) {
        // 失敗の応答でも元の画面は描き直されていることがある(検索 1000 件超など)。読み直さないと次の操作が古い要素を指す
        const page = await read(client).catch(() => undefined);
        // 画面が出ていれば中身は残してトーストで知らせる。何も出ていないときだけ画面にエラーを出す
        const p = page ?? latest.current.page;
        const msg = errorMessage(e);
        if (p && msg) errorToast(fail, msg);
        setState((s) => (p ? { ...s, page: p, status: "ready", busy: false } : msg ? { ...s, status: "error", error: msg, busy: false } : { ...s, busy: false }));
        return false;
      }
      await load();
      setState((s) => ({ ...s, busy: false }));
      return true;
    },
    [client, read, load],
  );
  return { ...state, run, load, retry };
}
