import { flushSync } from "react-dom";
import { createRoot, type Root } from "react-dom/client";
import type { ReactNode } from "react";
import css from "@/ui/tokens.css?inline";
import { mountShadowRoot, unmountShadowRoot } from "@/muscat/shell/mount";
import { LmsApp } from "./LmsApp";
import { LmsError } from "./LmsError";
import { LmsGate, type GateKind } from "./LmsGate";

let root: Root | null = null;

/** Shadow DOM に描く。描き終えてから戻る(すぐ覆いを外すと 1 コマだけ元の地が見える) */
function mount(node: ReactNode, full: boolean): void {
  if (root) return;
  const point = document.createElement("div");
  if (full) point.style.height = "100%";
  mountShadowRoot(document, css).appendChild(point);
  root = createRoot(point);
  const r = root;
  flushSync(() => r.render(node));
}

export const mountLms = (userName: string | null): void => mount(<LmsApp userName={userName} />, false);
/** 読み込み失敗の画面を Shadow DOM に出す */
export const mountLmsError = (): void => mount(<LmsError />, true);
/** ログアウト直後・ログイン失敗の案内を出す */
export const mountLmsGate = (kind: GateKind): void => mount(<LmsGate kind={kind} />, true);

/** 描画を止めて元の本文を戻す。描画中でなければ何もしない */
export function unmountLms(): void {
  if (!root) return;
  root.unmount();
  root = null;
  unmountShadowRoot(document);
}
