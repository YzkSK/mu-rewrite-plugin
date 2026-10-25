import { flushSync } from "react-dom";
import { createRoot, type Root } from "react-dom/client";
import css from "@/ui/tokens.css?inline";
import { createMuscatClient } from "../api/client";
import { readMenuIds } from "../api/menuIds";
import { App } from "./App";
import { drawerItems, lastLoginOf, loginUserOf } from "./drawerItems";
import { readMenuGroups } from "../api/menuGroups";
import { mountShadowRoot, unmountShadowRoot } from "./mount";
import { isLoggedIn } from "./resolveScreen";
import { screenCodeOf } from "./screenCode";import type { ScreenDef } from "./screens";

let current: { key: string; screen: ScreenDef; root: Root; keep: MutationObserver } | null = null;

/**
 * 元のサイトは画面を移るとき head・body ごと差し替え、ホストと隠す style も消える。次の mount まで元の画面が見えるので(実機で約 320ms)、
 * 消えたらすぐ元の場所へ戻す(MutationObserver は描画の前に動く)
 */
function keepMounted(): MutationObserver {
  const nodes = ["mu-react-host", "mu-react-hide", "mu-react-font", "mu-react-props"].map((id) => document.getElementById(id)).filter((n) => n !== null);
  const host = nodes[0];
  const keep = new MutationObserver(() => {
    // エラー画面・ログイン画面への差し替えは戻さず、元の画面を見せる(戻すと読み込み中のまま固まる。実機で確認)
    if (host && !host.isConnected && !isLoggedIn(document)) return unmountScreen();
    // 戻せば、次の画面を描くまで今の画面(押した直後の読み込み中の表示)がそのまま見える
    if (!host || host.isConnected) return;
    for (const n of nodes) if (!n.isConnected) (n === host ? document.body : document.head).appendChild(n);
    // 同じ画面のままなら次の mount は来ず、画面は古い DOM を見張ったままになるので、新しい DOM で描き直す
    if (current && screenCodeOf(document) === current.key) {
      const { screen, key } = current;
      unmountScreen();
      mountScreen(screen, key);
    }
  });
  keep.observe(document.documentElement, { childList: true, subtree: true });
  return keep;
}

/** 画面を Shadow DOM に描く。同じ key なら何もせず、別の key なら前の画面を外してから描く */
export function mountScreen(screen: ScreenDef, key: string): void {
  if (current?.key === key) return;
  unmountScreen();
  const ids = readMenuIds(document);
  const client = createMuscatClient({ fetch: window.fetch.bind(window), doc: document, ids });
  const found = readMenuGroups(document);
  // グループが読めなくても項目は出す
  const groups = found.length ? found : Object.keys(ids).length ? [{ title: "メニュー", labels: Object.keys(ids) }] : [];
  const mountPoint = document.createElement("div");
  mountShadowRoot(document, css).appendChild(mountPoint);
  const root = createRoot(mountPoint);
  current = { key, screen, root, keep: keepMounted() };
  // 描き終えてから覆いを外す(render は後で描くので、すぐ外すと 1 コマだけ元の白い地が見える。実機で確認)
  flushSync(() =>
    root.render(
      <App title={screen.title} model={drawerItems(document, groups, screen.title)} user={loginUserOf(document)} lastLogin={lastLoginOf(document)}>
        {screen.render(client, document)}
      </App>,
    ),
  );
}

/** 描画を止めて元の本文を戻す。描画中でなければ何もしない */
export function unmountScreen(): void {
  if (!current) return;
  current.keep.disconnect();
  current.root.unmount();
  current = null;
  unmountShadowRoot(document);
}
