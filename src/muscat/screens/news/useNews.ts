import { useCallback, useEffect, useState } from "react";
import type { MuscatClient } from "@/muscat/api/client";
import type { DriveStep } from "@/muscat/api/driver/drive";
import type { NewsPage } from "@/muscat/api/types";
import { errorMessage } from "../errorMessage";

export type NewsState = { status: "loading" | "ready" | "error"; page?: NewsPage; error?: string; busy?: boolean };

const QUIET_MS = 150;

/**
 * 生きたページの掲示板を読み、操作(run)のあとと、ほかの ajax で書き換わったあとに読み直す。操作中は前の結果を残す。
 * 属性の変化は見ない(parse が ref を属性で付けるので、見ると読み直しが止まらなくなる)。initial はテスト用
 */
export function useNews(client: MuscatClient, doc: Document, initial?: NewsState) {
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
    let timer: ReturnType<typeof setTimeout> | undefined;
    const observer = new MutationObserver(() => {
      clearTimeout(timer);
      timer = setTimeout(() => void read(), QUIET_MS);
    });
    const opts = { subtree: true, childList: true, characterData: true };
    const targets = [doc.getElementById("funcContent"), doc.getElementById("bsd00702:dialog")].filter((e): e is HTMLElement => !!e);
    for (const t of targets.length ? targets : [doc.body]) observer.observe(t, opts);
    return () => {
      clearTimeout(timer);
      observer.disconnect();
    };
  }, [client, doc, read]);
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
