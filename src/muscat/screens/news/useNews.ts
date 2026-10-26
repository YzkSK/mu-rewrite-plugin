import type { MuscatClient } from "@/muscat/api/client";
import type { NewsPage } from "@/muscat/api/types";
import { useLiveScreen, type LiveState } from "../useLiveScreen";

export type NewsState = LiveState<NewsPage>;

const read = (c: MuscatClient) => c.news.read();

/** 複製の掲示板を読み、操作(run)のあとに読み直す。失敗は useLiveScreen と同じくトースト。initial はテスト用 */
export const useNews = (client: MuscatClient, initial?: NewsState) => useLiveScreen(client, read, initial);
