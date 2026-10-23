import { createRoot, type Root } from "react-dom/client";
import css from "@/ui/tokens.css?inline";
import { createMuscatClient } from "../api/client";
import { readMenuIds } from "../api/menuIds";
import { App } from "./App";
import { drawerItems, loginUserOf } from "./drawerItems";
import { mountShadowRoot, unmountShadowRoot } from "./mount";
import { SETTING_LABEL } from "./nativeNav";
import type { ScreenDef } from "./screens";

let current: { key: string; root: Root } | null = null;

/** 画面を Shadow DOM に描く。同じ key なら何もせず、別の key なら前の画面を外してから描く */
export function mountScreen(screen: ScreenDef, key: string): void {
  if (current?.key === key) return;
  unmountScreen();
  const ids = readMenuIds(document);
  const client = createMuscatClient({ fetch: window.fetch.bind(window), doc: document, ids });
  const items = drawerItems(document, [...Object.keys(ids), SETTING_LABEL], screen.title);
  const mountPoint = document.createElement("div");
  mountShadowRoot(document, css).appendChild(mountPoint);
  const root = createRoot(mountPoint);
  current = { key, root };
  root.render(
    <App title={screen.title} items={items} user={loginUserOf(document)}>
      {screen.render(client, document)}
    </App>,
  );
}

/** 描画を止めて元の本文を戻す。描画中でなければ何もしない */
export function unmountScreen(): void {
  if (!current) return;
  current.root.unmount();
  current = null;
  unmountShadowRoot(document);
}
