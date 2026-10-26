import type { MuscatClient } from "@/muscat/api/client";
import type { HomePage } from "@/muscat/api/types";
import { useLiveScreen, type LiveState } from "../useLiveScreen";

export type HomeState = LiveState<HomePage>;

const read = (c: MuscatClient) => c.home.read();

/** 複製のホームを読み、操作(run)のあとに読み直す。失敗は useLiveScreen と同じくトースト。initial はテスト用 */
export function useHome(client: MuscatClient, initial?: HomeState) {
  const { load, ...live } = useLiveScreen(client, read, initial);
  return { ...live, read: load };
}
