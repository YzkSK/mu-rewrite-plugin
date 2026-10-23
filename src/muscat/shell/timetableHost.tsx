import { createRoot, type Root } from "react-dom/client";
import css from "@/ui/tokens.css?inline";
import { createMuscatClient } from "../api/client";
import { readMenuIds } from "../api/menuIds";
import { App } from "./App";
import { mountShadowRoot, unmountShadowRoot } from "./mount";
import { nativeNav } from "./nativeNav";

let root: Root | null = null;

/** 時間割を Shadow DOM に描く。描画中なら何もしない。その時点の DOM からメニュー ID を読み直す */
export function mountTimetable(): void {
  if (root) return;
  const ids = readMenuIds(document);
  const client = createMuscatClient({ fetch: window.fetch.bind(window), doc: document, ids });
  const year = Number(document.querySelector<HTMLInputElement>('[name="funcForm:nendo_input"]')?.value) || new Date().getFullYear();
  const menuLabels = Object.keys(ids).filter((l) => l !== "学生時間割表");
  const mountPoint = document.createElement("div");
  mountShadowRoot(document, css).appendChild(mountPoint);
  root = createRoot(mountPoint);
  root.render(<App client={client} year={year} menuLabels={menuLabels} onNavigate={(l) => nativeNav(document, l)} />);
}

/** 描画を止めて元の本文を戻す。描画中でなければ何もしない */
export function unmountTimetable(): void {
  if (!root) return;
  root.unmount();
  root = null;
  unmountShadowRoot(document);
}
