import { useCallback, useEffect, useState } from "react";
import type { MuscatClient } from "@/muscat/api/client";
import type { DriveStep } from "@/muscat/api/driver/drive";
import type { GenericPage } from "@/muscat/api/types";
import { errorMessage } from "../errorMessage";

export type LiveState = { status: "loading" | "ready" | "error"; page?: GenericPage; error?: string };

const QUIET_MS = 150;

/**
 * 生きたページを読み、操作(run)のあとと、ほかの ajax で #funcForm が書き換わったあとに読み直す。
 * 属性の変化は aria-hidden しか見ない(parse が ref を属性で付けるので、全部見ると読み直しが止まらなくなる)。initial はテスト用
 */
export function useLivePage(client: MuscatClient, doc: Document, initial?: LiveState) {
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
    let timer: ReturnType<typeof setTimeout> | undefined;
    const observer = new MutationObserver(() => {
      clearTimeout(timer);
      timer = setTimeout(() => void read(), QUIET_MS);
    });
    // フォームごと差し替えられても追えるよう、ひとつ外側を見る。ダイアログの開閉は aria-hidden の変化だけのことがあるので、それだけ属性も見る
    observer.observe(doc.getElementById("funcForm")?.parentElement ?? doc.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ["aria-hidden"] });
    // フォームの外(body の直下)に移されたダイアログの開閉も見る
    observer.observe(doc.body, { subtree: true, attributes: true, attributeFilter: ["aria-hidden"] });
    return () => {
      clearTimeout(timer);
      observer.disconnect();
    };
  }, [client, doc, read]);
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
