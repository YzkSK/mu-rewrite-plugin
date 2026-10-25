import { blockNativeScripts } from "@/ui/block";
import { muscatMode, type Mode } from "./native";

/** 元の画面を描く /uprx/up/ 配下だけ、元の script を止める(入口・中継ページは元の script が必要なので止めない) */
const APP_PAGES = "/uprx/up/";

/**
 * document_start で 1 回呼ぶ。働き方を決め、app なら元の script を止める(「元の画面で開く」の印があれば何もしない)。
 * 止めた script は、描かないと分かったページ(ログイン・エラーなど)で unblockNativeScripts が動かし直す。stop は見張りを止める(DOMContentLoaded で自動でも止まる)
 */
export function boot(env: { doc: Document; pathname: string; storage: Pick<Storage, "getItem" | "setItem" | "removeItem">; now: number }): { mode: Mode; blocked: boolean; stop: () => void } {
  const mode = muscatMode(env.pathname, env.storage, env.now);
  const blocked = mode === "app" && env.pathname.startsWith(APP_PAGES);
  return { mode, blocked, stop: blocked ? blockNativeScripts(env.doc) : () => {} };
}
