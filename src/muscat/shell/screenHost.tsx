import { createRoot, type Root } from "react-dom/client";
import css from "@/ui/tokens.css?inline";
import { createMuscatClient } from "../api/client";
import { readMenuIds } from "../api/menuIds";
import { App } from "./App";
import { drawerItems, lastLoginOf, loginUserOf } from "./drawerItems";
import { readMenuGroups } from "../api/menuGroups";
import { mountShadowRoot, unmountShadowRoot } from "./mount";
import type { ScreenDef } from "./screens";

let current: { key: string; root: Root } | null = null;

/** 画面を Shadow DOM に描く。同じ key なら何もせず、別の key なら前の画面を外してから描く */
export function mountScreen(screen: ScreenDef, key: string): void {
  if (current?.key === key) return;
  unmountScreen();
  const ids = readMenuIds(document);
  const client = createMuscatClient({ fetch: window.fetch.bind(window), doc: document, ids });
  const found = readMenuGroups(document);
  // グループが読めなくても項目は出す
  const groups = found.length ? found : Object.keys(ids).length ? [{ title: "メニュー", labels: Object.keys(ids) }] : [];
  const model = drawerItems(document, groups, screen.title);
  const mountPoint = document.createElement("div");
  mountShadowRoot(document, css).appendChild(mountPoint);
  const root = createRoot(mountPoint);
  current = { key, root };
  root.render(
    <App title={screen.title} model={model} user={loginUserOf(document)} lastLogin={lastLoginOf(document)}>
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
