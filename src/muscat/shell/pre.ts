const ID = "mu-react-pre";

/** 描画前に元の画面が一瞬見えないよう body を隠す。2 回呼んでも 1 つだけ */
export function installPreHide(doc: Document): void {
  if (doc.getElementById(ID)) return;
  const style = doc.createElement("style");
  style.id = ID;
  style.textContent = "html.mu-pre body { visibility: hidden }";
  doc.documentElement.append(style);
  doc.documentElement.classList.add("mu-pre");
}

/** 覆いをスタイルごと外す。付いていなくても何もしない */
export function releasePreHide(doc: Document): void {
  doc.getElementById(ID)?.remove();
  doc.documentElement.classList.remove("mu-pre");
}
