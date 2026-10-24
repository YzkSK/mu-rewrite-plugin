const ID = "mu-react-pre";

// 描画までの間も、上の段の線・サイドバーの地(React の枠と同じ寸法)を見せ、中身の真ん中に回るアイコンを出す
const LINE = "linear-gradient(#541b86,#541b86) 0 0/100% 56px no-repeat";
const CSS = `html.mu-pre body { visibility: hidden }
html.mu-pre { min-height: 100%; background: ${LINE}, #f3f2f5 }
html.mu-pre.mu-pre-side { background: ${LINE}, linear-gradient(#d9d4df,#d9d4df) 15rem 56px/1px 100% no-repeat, linear-gradient(#fff,#fff) 0 56px/15rem 100% no-repeat, #f3f2f5 }
html.mu-pre::after { content: ""; position: fixed; top: calc(50% + 28px); left: 50%; width: 32px; height: 32px; margin: -16px 0 0 -16px; box-sizing: border-box; border: 3px solid #d9d4df; border-top-color: #541b86; border-radius: 50%; animation: mu-pre-spin .8s linear infinite }
html.mu-pre.mu-pre-side::after { left: calc(50% + 7.5rem) }
@keyframes mu-pre-spin { to { transform: rotate(360deg) } }
@media (prefers-reduced-motion: reduce) { html.mu-pre::after { animation-duration: 2.4s } }`;

/** サイドバーが開いて描かれるか(useSidebarState と同じ判定: 広い画面で、閉じたと保存されていない) */
function sidebarOpen(): boolean {
  try {
    return !matchMedia("(max-width: 767.98px)").matches && localStorage.getItem("mu-m-drawer") !== "closed";
  } catch {
    return false;
  }
}

let epoch = 0;
/** 覆いを掛けた回数。待ってから外す処理は、待つ間に掛け直されていたら外さない */
export const preEpoch = (): number => epoch;

/** 描画前に元の画面が一瞬見えないよう body を隠し、代わりに枠の形と読み込み中のアイコンを描く。2 回呼んでも 1 つだけ */
export function installPreHide(doc: Document): void {
  epoch++;
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
