import { useCallback, useEffect, useState } from "react";
import type { MuscatClient } from "@/muscat/api/client";
import type { DriveStep } from "@/muscat/api/driver/drive";
import { errorMessage } from "./errorMessage";

export type LiveState<T> = { status: "loading" | "ready" | "error"; page?: T; error?: string; busy?: boolean };

/**
 * 複製の document を read で読み、操作(run)のあとに読み直す。操作中は前の結果を残す。
 * 複製は自分の通信でしか変わらないので、書き換えの見張りはしない。
 * read は呼び出し側のモジュール直下の定数にする(effect の依存になる)。initial はテスト用。
 */
export function useLiveScreen<T>(client: MuscatClient, read: (c: MuscatClient) => Promise<T>, initial?: LiveState<T>) {
  const [state, setState] = useState<LiveState<T>>(initial ?? { status: "loading" });
  const load = useCallback(
    () =>
      read(client).then(
        (page) => setState((s) => ({ status: "ready", page, busy: s.busy })),
        (e) => setState((s) => ({ ...s, status: "error", error: errorMessage(e) })),
      ),
    [client, read],
  );
  useEffect(() => {
    void load();
  }, [load]);
  const run = useCallback(
    /** 成功したかを返す(失敗したら続きの処理をしない) */
    async (steps: DriveStep[], after?: () => Promise<void>): Promise<boolean> => {
      setState((s) => ({ ...s, busy: true }));
      try {
        if (steps.length) await client.driveLive(steps);
        await after?.(); // 元の部品を押さず直接送る通信(steps のあと、読み直しの前)
      } catch (e) {
        // 失敗の応答でも元の画面は描き直されていることがある(検索 1000 件超など)。読み直さないと次の操作が古い要素を指す
        const page = await read(client).catch(() => undefined);
        setState((s) => ({ ...s, page: page ?? s.page, status: "error", error: errorMessage(e), busy: false }));
        return false;
      }
      await load();
      setState((s) => ({ ...s, busy: false }));
      return true;
    },
    [client, read, load],
  );
  return { ...state, run };
}
