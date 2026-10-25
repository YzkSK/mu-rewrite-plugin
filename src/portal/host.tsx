import { flushSync } from "react-dom";
import { createRoot, type Root } from "react-dom/client";
import css from "@/ui/tokens.css?inline";
import { mountShadowRoot, unmountShadowRoot } from "@/muscat/shell/mount";
import type { PortalData } from "./data";
import { PortalApp } from "./PortalApp";

let root: Root | null = null;

/** Shadow DOM に描く。描き終えてから戻る(すぐ覆いを外すと 1 コマだけ元の地が見える) */
export function mountPortal(data: PortalData): void {
  if (root) return;
  const point = document.createElement("div");
  mountShadowRoot(document, css).appendChild(point);
  root = createRoot(point);
  const r = root;
  flushSync(() => r.render(<PortalApp data={data} />));
}

/** 描画を止めて元の本文を戻す。描画中でなければ何もしない */
export function unmountPortal(): void {
  if (!root) return;
  root.unmount();
  root = null;
  unmountShadowRoot(document);
}
