const ID = "mu-react-pre";

// 描画までの間も白一色にせず、上の段の線・サイドバーの地・読み込みの帯で、移動中に見せる(React の枠と同じ寸法)
const LINE = "linear-gradient(#e8e6ec,#e8e6ec) 0 69px/100% 1px no-repeat";
const CSS = `html.mu-pre body { visibility: hidden }
html.mu-pre { min-height: 100%; background: ${LINE}, #fff }
html.mu-pre.mu-pre-side { background: ${LINE}, linear-gradient(#e8e6ec,#e8e6ec) 17rem 70px/1px 100% no-repeat, linear-gradient(#f8f6fb,#f8f6fb) 0 70px/17rem 100% no-repeat, #fff }
html.mu-pre::after { content: ""; position: fixed; top: 69px; left: 0; width: 35%; height: 3px; background: #541b86; animation: mu-pre-slide 1.1s ease-in-out infinite }
@keyframes mu-pre-slide { 0% { left: -35% } 100% { left: 100% } }
@media (prefers-reduced-motion: reduce) { html.mu-pre::after { animation: none; width: 100%; opacity: .6 } }`;

/** サイドバーが開いて描かれるか(useSidebarState と同じ判定: 広い画面で、閉じたと保存されていない) */
function sidebarOpen(): boolean {
  try {
    return !matchMedia("(max-width: 767.98px)").matches && localStorage.getItem("mu-m-drawer") !== "closed";
  } catch {
    return false;
  }
}

/** 描画前に元の画面が一瞬見えないよう body を隠し、代わりに枠の形だけ描く。2 回呼んでも 1 つだけ */
export function installPreHide(doc: Document): void {
  if (doc.getElementById(ID)) return;
  const style = doc.createElement("style");
  style.id = ID;
  style.textContent = CSS;
  doc.documentElement.append(style);
  doc.documentElement.classList.add("mu-pre");
  if (sidebarOpen()) doc.documentElement.classList.add("mu-pre-side");
}

/** 覆いをスタイルごと外す。付いていなくても何もしない */
export function releasePreHide(doc: Document): void {
  doc.getElementById(ID)?.remove();
  doc.documentElement.classList.remove("mu-pre", "mu-pre-side");
}
