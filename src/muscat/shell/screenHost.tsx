import { createRoot, type Root } from "react-dom/client";
import css from "@/ui/tokens.css?inline";
import { createMuscatClient } from "../api/client";
import { readMenuIds } from "../api/menuIds";
import { App } from "./App";
import { mountShadowRoot, unmountShadowRoot } from "./mount";
import { nativeNav } from "./nativeNav";
import { SCREENS } from "./screens";

let current: { code: string; root: Root } | null = null;

/** 登録済みの画面を Shadow DOM に描く。同じコードなら何もせず、別のコードなら前の画面を外してから描く */
export function mountScreen(code: string): void {
  const screen = Object.hasOwn(SCREENS, code) ? SCREENS[code] : undefined;
  if (!screen) return unmountScreen();
  if (current?.code === code) return;
  unmountScreen();
  const ids = readMenuIds(document);
  const client = createMuscatClient({ fetch: window.fetch.bind(window), doc: document, ids });
  const menuLabels = Object.keys(ids).filter((l) => l !== screen.title);
  const mountPoint = document.createElement("div");
  mountShadowRoot(document, css).appendChild(mountPoint);
  const root = createRoot(mountPoint);
  current = { code, root };
  root.render(
    <App title={screen.title} menuLabels={menuLabels} onNavigate={(l) => nativeNav(document, l)}>
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
