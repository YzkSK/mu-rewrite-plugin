import { useCallback, useEffect, useState } from "react";
import type { MuscatClient } from "@/muscat/api/client";
import type { DriveStep } from "@/muscat/api/driver/drive";
import { errorMessage } from "./errorMessage";

export type LiveState<T> = { status: "loading" | "ready" | "error"; page?: T; error?: string; busy?: boolean };

const QUIET_MS = 150;

/**
 * 生きたページを read で読み、操作(run)のあとと、ほかの ajax で書き換わったあとに読み直す。操作中は前の結果を残す。
 * read は呼び出し側のモジュール直下の定数にする(effect の依存になる)。属性の変化は見ない。initial はテスト用。
 * quietMs: 書き換えが止まってから読み直すまでの間(大きな表を少しずつ描き足す画面では長くして、途中で何度も全部読まない)
 */
export function useLiveScreen<T>(client: MuscatClient, doc: Document, read: (c: MuscatClient) => Promise<T>, initial?: LiveState<T>, quietMs = QUIET_MS) {
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
    let timer: ReturnType<typeof setTimeout> | undefined;
    const observer = new MutationObserver(() => {
      clearTimeout(timer);
      timer = setTimeout(() => void load(), quietMs);
    });
    observer.observe(doc.getElementById("funcContent") ?? doc.body, { subtree: true, childList: true, characterData: true });
    return () => {
      clearTimeout(timer);
      observer.disconnect();
    };
  }, [doc, load, quietMs]);
  const run = useCallback(
    /** 成功したかを返す(失敗したら続きの処理をしない) */
    async (steps: DriveStep[], after?: () => Promise<void>): Promise<boolean> => {
      setState((s) => ({ ...s, busy: true }));
      try {
        if (steps.length) await client.driveLive(steps);
        await after?.(); // 元の部品を押さず直接送る通信(steps のあと、読み直しの前)
      } catch (e) {
        setState((s) => ({ ...s, status: "error", error: errorMessage(e), busy: false }));
        return false;
      }
      await load();
      setState((s) => ({ ...s, busy: false }));
      return true;
    },
    [client, load],
  );
  return { ...state, run };
}
