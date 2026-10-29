import { FONT_URL } from "./mount";
const ID = "mu-react-pre";

// 描画までの間は元の画面を隠すだけにし、枠や文字は描かない。Chrome は次のページが文字などの中身を描くまで前のページを
// 出したままにするので、枠を描くとそこで前のページが消え、枠 → 画面と切り替わってちらついて見えた(実機で確認)
const CSS = `html.mu-pre body { visibility: hidden }
html.mu-pre { min-height: 100%; background: #f3f2f5 }`;

let epoch = 0;
/** 覆いを掛けた回数。待ってから外す処理は、待つ間に掛け直されていたら外さない */
export const preEpoch = (): number => epoch;

/** 描画前に元の画面が一瞬見えないよう body を隠す。2 回呼んでも 1 つだけ */
export function installPreHide(doc: Document): void {
  epoch++;
  if (doc.getElementById(ID)) return;
  const style = doc.createElement("style");
  style.id = ID;
  style.textContent = CSS;
  doc.documentElement.append(style);
  doc.documentElement.classList.add("mu-pre");
  // 書体も先に読み始める(描いた瞬間に書体が替わらないように)。mount 側は同じ id があれば足さない
  if (!doc.getElementById("mu-react-font")) {
    const link = Object.assign(doc.createElement("link"), { id: "mu-react-font", rel: "stylesheet", href: FONT_URL() });
    (doc.head ?? doc.documentElement).append(link);
  }
}

/** 覆いをスタイルごと外す。付いていなくても何もしない */
export function releasePreHide(doc: Document): void {
  doc.getElementById(ID)?.remove();
  doc.documentElement.classList.remove("mu-pre");
}
