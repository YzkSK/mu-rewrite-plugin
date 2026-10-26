import { useCallback, useEffect, useState } from "react";
import type { MuscatClient } from "@/muscat/api/client";
import type { DriveStep } from "@/muscat/api/driver/drive";
import type { GenericPage } from "@/muscat/api/types";
import { errorMessage } from "../errorMessage";

export type LiveState = { status: "loading" | "ready" | "error"; page?: GenericPage; error?: string; nothingToAnswer?: boolean };

/**
 * 複製の document を読み、操作(run)のあとに読み直す(複製は自分の通信でしか変わらない)。initial はテスト用。
 * pageRead は page 以外も返す読み方への差し替え(安否確認。client のメソッドを渡す)
 */
export function useLivePage(client: MuscatClient, initial?: LiveState, pageRead?: () => Promise<{ page: GenericPage; nothingToAnswer?: boolean }>) {
  const [state, setState] = useState<LiveState>(initial ?? { status: "loading" });
  const read = useCallback(
    () =>
      (pageRead ? pageRead() : client.readLivePage().then((page) => ({ page }))).then(
        (r) => setState({ status: "ready", ...r }),
        (e) => setState((s) => ({ ...s, status: "error", error: errorMessage(e) })),
      ),
    [client, pageRead],
  );
  useEffect(() => {
    void read();
  }, [read]);
  const run = useCallback(
    async (steps: DriveStep[]) => {
      try {
        await client.driveLive(steps);
      } catch (e) {
        setState((s) => ({ ...s, status: "error", error: errorMessage(e) }));
        return;
      }
      await read();
    },
    [client, read],
  );
  return { ...state, run };
}
