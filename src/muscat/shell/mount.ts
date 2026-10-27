const HOST_ID = "mu-react-host";
const HIDE_ID = "mu-react-hide";
const FONT_ID = "mu-react-font";
const PROPS_ID = "mu-react-props";

/** ホストと本文を隠す style を取り除く(@property と IBM Plex Sans JP の link は残す) */
export function unmountShadowRoot(doc: Document): void {
  doc.getElementById(HOST_ID)?.remove();
  doc.getElementById(HIDE_ID)?.remove();
}

/**
 * Shadow DOM のルートを作り、元の本文を隠す。2 回呼んでも 1 つだけ。
 * css を渡すと shadow 内の <style> に入れる。Shadow DOM 内では Tailwind v4 の @property が効かないので、
 * @property だけはページ側の head にも入れる。IBM Plex Sans JP も shadow 内の @font-face では読めないので head に <link> を足す。
 */
export function mountShadowRoot(doc: Document, css = ""): ShadowRoot {
  const existing = doc.getElementById(HOST_ID);
  if (existing?.shadowRoot) return existing.shadowRoot;

  const host = doc.createElement("div");
  host.id = HOST_ID;
  doc.body.appendChild(host);
  const root = host.attachShadow({ mode: "open" });
  const style = doc.createElement("style");
  style.textContent = css;
  root.appendChild(style);

  if (!doc.getElementById(HIDE_ID)) {
    const hide = doc.createElement("style");
    hide.id = HIDE_ID;
    // 教員の予定は Schedule の描画に頼らず通信で直接取るので、元の画面はいつも display:none。
    // 画面の外に置くと、大きな表を描き足すたびに配置の計算が走って重い(教室予約で取得 23 秒 → 3 秒。実機で測定)。
    // 元の body の下余白でスクロールしないよう、ホストは画面に固定する
    // rem の基準を揃える。MUSCAT の元ページは html が 14px で、ポータル・LMS(16px)より全体が小さくなっていた(実機で測定)
    hide.textContent = `html { font-size: 16px !important } body > *:not(#${HOST_ID}) { display: none !important } #${HOST_ID} { position: fixed; inset: 0; z-index: 2147483000 }`;
    doc.head.appendChild(hide);
  }
  const props = css.match(/@property[^{]+\{[^}]*\}/g);
  if (props && !doc.getElementById(PROPS_ID)) {
    const s = doc.createElement("style");
    s.id = PROPS_ID;
    s.textContent = props.join("\n");
    doc.head.appendChild(s);
  }
  if (!doc.getElementById(FONT_ID)) {
    const link = doc.createElement("link");
    link.id = FONT_ID;
    link.rel = "stylesheet";
    link.href = "https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+JP:wght@400;500;600;700&display=block";
    doc.head.appendChild(link);
  }
  return root;
}
