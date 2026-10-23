import { screenCodeOf } from "./screenCode";
import { isHomeScreen, isLoggedIn, resolveScreen } from "./resolveScreen";
import { reenter } from "./reenter";
import type { ScreenDef } from "./screens";

export type AppDeps = {
  bg: { reportScreen(leaf: string): void; askRestore(): Promise<string>; reportBounce(): Promise<void>; isBouncing(): Promise<boolean> };
  storage: Pick<Storage, "getItem" | "setItem">;
  pathname: string;
  replace(url: string): void;
  mount(screen: ScreenDef, key: string): void;
  unmount(): void;
  nav(doc: Document, label: string): boolean;
  watch(doc: Document, onChange: (code: string) => void): unknown;
  /** 覆いを外す */
  release(): void;
  now(): number;
};

/**
 * DOMContentLoaded 後に 1 回呼ぶ。メニューの無いページは入り直すか覆いを外す。
 * ログイン済みなら、ホームで直前の画面を復元し(覆いは保つ)、画面コードを見張って mount / unmount する。
 */
export async function mountApp(doc: Document, d: AppDeps): Promise<void> {
  if (!isLoggedIn(doc)) {
    const bounced = await reenter({ loggedIn: false, pathname: d.pathname, storage: d.storage, now: d.now(), reportBounce: d.bg.reportBounce, replace: d.replace });
    // 入り直しの途中の中継ページは見せない(覆いは 20 秒で外れる)
    if (!bounced && !(await d.bg.isBouncing())) d.release();
    return;
  }
  // 入り直した直後なら、ホームを描かずに直前の画面へ進む
  let restoring = false;
  if (isHomeScreen(screenCodeOf(doc), doc)) {
    const leaf = await d.bg.askRestore();
    restoring = !!leaf && d.nav(doc, leaf);
  }
  d.watch(doc, (code) => {
    const screen = resolveScreen(code, doc);
    if (!screen) return d.unmount();
    const home = isHomeScreen(code, doc);
    if (restoring) {
      if (home) return;
      restoring = false;
    }
    d.mount(screen, code);
    d.bg.reportScreen(home ? "" : screen.title);
    d.release();
  });
}
