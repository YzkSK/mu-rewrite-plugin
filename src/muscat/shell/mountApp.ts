import type { MuscatClient } from "../api/client";
import { LOGGED_OUT_KEY, isLoginPage, loginPageAction, publicSyllabusHref } from "./loginPage";
import { reenter } from "./reenter";
import { isHomeScreen, isLoggedIn } from "./resolveScreen";
import { screenCodeOf } from "./screenCode";
import type { OnScreen } from "./screenHost";

export type AppDeps = {
  bg: { reportScreen(leaf: string): void; askRestore(): Promise<string>; reportBounce(): Promise<void>; isBouncing(): Promise<boolean> };
  storage: Pick<Storage, "getItem" | "setItem" | "removeItem">;
  pathname: string;
  replace(url: string): void;
  /** パスワードのログイン画面の代わりに、拡張の小さな画面を描く */
  showLoggedOut(props: { failed: boolean; syllabusHref: string }): void;
  /** この Document(元の画面。script は動いていない)を複製して持つ client */
  createClient(doc: Document): MuscatClient;
  /** 描く。画面が替わるたびに onScreen を呼ぶ */
  mount(client: MuscatClient, onScreen: OnScreen): void;
  /** 描かないページ(ログイン・中継・エラー)では、止めていた元の script を動かし直す */
  unblock(): void;
  /** 覆いを外す */
  release(): void;
  now(): number;
};

/**
 * DOMContentLoaded 後に 1 回呼ぶ。メニューの無いページは入り直すか、元の画面を動かして覆いを外す。
 * ログイン済みなら、ホームで直前の画面を復元(メニューの POST。覆いは保つ)してから描く。
 * 以後の画面の移動は client の中で完結し(元の画面は動かない)、移るたびに onScreen が呼ばれる
 */
export async function mountApp(doc: Document, d: AppDeps): Promise<void> {
  if (!isLoggedIn(doc)) {
    if (isLoginPage(doc)) {
      if (loginPageAction({ storage: d.storage, now: d.now() }) === "sso") return d.replace("/uprx/ShibbolethAuthServlet");
      let loggedOut = false;
      try {
        loggedOut = !!d.storage.getItem(LOGGED_OUT_KEY);
      } catch {}
      d.showLoggedOut({ failed: !loggedOut, syllabusHref: publicSyllabusHref(doc) });
      d.release();
      return;
    }
    const bounced = await reenter({ loggedIn: false, pathname: d.pathname, storage: d.storage, now: d.now(), reportBounce: d.bg.reportBounce, replace: d.replace });
    if (bounced) return;
    d.unblock(); // 中継ページの自動送信など、元の script が要る
    // 入り直しの途中の中継ページは見せない(覆いは 20 秒で外れる)
    if (!(await d.bg.isBouncing())) d.release();
    return;
  }
  try {
    d.storage.removeItem(LOGGED_OUT_KEY); // 入れたので、次に /uprx/ を開いたときは SSO へ飛ばす
  } catch {}
  const client = d.createClient(doc);
  // 入り直した直後なら、ホームを描かずに直前の画面へ進む。開けなければホームのまま
  if (isHomeScreen(screenCodeOf(doc), doc)) {
    const leaf = await d.bg.askRestore();
    if (leaf) await client.navigate(leaf).catch(() => {});
  }
  d.mount(client, (screen, home) => {
    if (screen) d.bg.reportScreen(home ? "" : screen.title);
    d.release();
  });
}
