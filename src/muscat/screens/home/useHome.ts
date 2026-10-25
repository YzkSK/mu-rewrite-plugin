import { useCallback, useEffect, useState } from "react";
import type { MuscatClient } from "@/muscat/api/client";
import type { DriveStep } from "@/muscat/api/driver/drive";
import type { HomePage } from "@/muscat/api/types";
import { errorMessage } from "../errorMessage";

export type HomeState = { status: "loading" | "ready" | "error"; page?: HomePage; error?: string; busy?: boolean };

/** 複製のホームを読み、操作(run)のあとに読み直す。操作中は前の結果を残す。initial はテスト用 */
export function useHome(client: MuscatClient, initial?: HomeState) {
  const [state, setState] = useState<HomeState>(initial ?? { status: "loading" });
  const read = useCallback(
    () =>
      client.readHome().then(
        (page) => setState((s) => ({ status: "ready", page, busy: s.busy })),
        (e) => setState((s) => ({ ...s, status: "error", error: errorMessage(e) })),
      ),
    [client],
  );
  useEffect(() => {
    void read();
  }, [read]);
  const run = useCallback(
    async (steps: DriveStep[]) => {
      setState((s) => ({ ...s, busy: true }));
      try {
        await client.driveLive(steps);
      } catch (e) {
        setState((s) => ({ ...s, status: "error", error: errorMessage(e), busy: false }));
        return;
      }
      await read();
      setState((s) => ({ ...s, busy: false }));
    },
    [client, read],
  );
  return { ...state, run, read };
}
