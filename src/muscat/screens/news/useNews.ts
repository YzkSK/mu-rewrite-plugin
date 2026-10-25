import { useCallback, useEffect, useState } from "react";
import type { MuscatClient } from "@/muscat/api/client";
import type { DriveStep } from "@/muscat/api/driver/drive";
import type { NewsPage } from "@/muscat/api/types";
import { errorMessage } from "../errorMessage";

export type NewsState = { status: "loading" | "ready" | "error"; page?: NewsPage; error?: string; busy?: boolean };

/** 複製の掲示板を読み、操作(run)のあとに読み直す。操作中は前の結果を残す。initial はテスト用 */
export function useNews(client: MuscatClient, initial?: NewsState) {
  const [state, setState] = useState<NewsState>(initial ?? { status: "loading" });
  const read = useCallback(
    () =>
      client.readNews().then(
        (page) => setState((s) => ({ status: "ready", page, busy: s.busy })),
        (e) => setState((s) => ({ ...s, status: "error", error: errorMessage(e) })),
      ),
    [client],
  );
  useEffect(() => {
    void read();
  }, [read]);
  const run = useCallback(
    /** 成功したかを返す(終わったあとの Toast 用) */
    async (steps: DriveStep[]): Promise<boolean> => {
      setState((s) => ({ ...s, busy: true }));
      try {
        await client.driveLive(steps);
      } catch (e) {
        setState((s) => ({ ...s, status: "error", error: errorMessage(e), busy: false }));
        return false;
      }
      await read();
      setState((s) => ({ ...s, busy: false }));
      return true;
    },
    [client, read],
  );
  return { ...state, run };
}
