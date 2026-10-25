import { useCallback, useEffect, useState } from "react";
import type { MuscatClient } from "@/muscat/api/client";
import type { DriveStep } from "@/muscat/api/driver/drive";
import type { GenericPage } from "@/muscat/api/types";
import { errorMessage } from "../errorMessage";

export type LiveState = { status: "loading" | "ready" | "error"; page?: GenericPage; error?: string };

/** 複製の document を読み、操作(run)のあとに読み直す(複製は自分の通信でしか変わらない)。initial はテスト用 */
export function useLivePage(client: MuscatClient, initial?: LiveState) {
  const [state, setState] = useState<LiveState>(initial ?? { status: "loading" });
  const read = useCallback(
    () =>
      client.readLivePage().then(
        (page) => setState({ status: "ready", page }),
        (e) => setState((s) => ({ status: "error", page: s.page, error: errorMessage(e) })),
      ),
    [client],
  );
  useEffect(() => {
    void read();
  }, [read]);
  const run = useCallback(
    async (steps: DriveStep[]) => {
      try {
        await client.driveLive(steps);
      } catch (e) {
        setState((s) => ({ status: "error", page: s.page, error: errorMessage(e) }));
        return;
      }
      await read();
    },
    [client, read],
  );
  return { ...state, run };
}
