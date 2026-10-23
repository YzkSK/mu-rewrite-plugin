const HOST_ID = "mu-react-host";
const HIDE_ID = "mu-react-hide";
const FONT_ID = "mu-react-font";

/** ホストと本文を隠す style を取り除く(@property と Murecho の link は残す) */
export function unmountShadowRoot(doc: Document): void {
  doc.getElementById(HOST_ID)?.remove();
  doc.getElementById(HIDE_ID)?.remove();
}

/**
 * Shadow DOM のルートを作り、元の本文を隠す。2 回呼んでも 1 つだけ。
 * css を渡すと shadow 内の <style> に入れる。Shadow DOM 内では Tailwind v4 の @property が効かないので、
 * @property だけはページ側の head にも入れる。Murecho も shadow 内の @font-face では読めないので head に <link> を足す。
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
    hide.textContent = `body > *:not(#${HOST_ID}) { display: none !important }`;
    doc.head.appendChild(hide);
  }
  const props = css.match(/@property[^{]+\{[^}]*\}/g);
  if (props) {
    const s = doc.createElement("style");
    s.textContent = props.join("\n");
    doc.head.appendChild(s);
  }
  if (!doc.getElementById(FONT_ID)) {
    const link = doc.createElement("link");
    link.id = FONT_ID;
    link.rel = "stylesheet";
    link.href = "https://fonts.googleapis.com/css2?family=Murecho:wght@400;700&display=swap";
    doc.head.appendChild(link);
  }
  return root;
}
