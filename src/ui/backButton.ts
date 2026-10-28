const CSS = `
button { position: fixed; left: 50%; transform: translateX(-50%); bottom: 16px; z-index: 2147483647; padding: 6px 10px; border: 0; border-radius: 3px;
  background: #541b86; color: #fff; font: 12px/1.4 system-ui, sans-serif; cursor: pointer; opacity: 0.85; }
button:hover { opacity: 1; background: #3b1260; }
`;

/** 元の画面の下中央に(右下は LMS の浮いたボタンと重なる)「拡張の画面に戻る」を出す。元ページの CSS と衝突しないよう shadow DOM に入れる */
export function showBackButton(doc: Document, onClick: () => void): void {
  const add = () => void addBackButton(doc, onClick);
  if (doc.readyState === "loading") doc.addEventListener("DOMContentLoaded", add, { once: true });
  else add();
}

/** body があるときに呼ぶ。返すホスト要素の style.display で出し入れできる */
export function addBackButton(doc: Document, onClick: () => void): HTMLElement {
  const host = doc.createElement("div");
  const root = host.attachShadow({ mode: "open" });
  const style = doc.createElement("style");
  style.textContent = CSS;
  const button = doc.createElement("button");
  button.type = "button";
  button.textContent = "拡張の画面に戻る";
  button.addEventListener("click", onClick);
  root.append(style, button);
  doc.body.appendChild(host);
  return host;
}
