const BLOCKED = "text/x-mu-blocked";
const SEL = "script, link[rel=modulepreload]";

/** 元のアプリの script を実行前に無効にする(同一オリジンの src か、中身だけの script)。modulepreload も消す */
function neutralize(el: Element): void {
  if (el instanceof HTMLScriptElement) {
    const src = el.getAttribute("src");
    if (src !== null) {
      let same = false;
      try { same = new URL(src, location.href).origin === location.origin; } catch { /* 読めない URL は触らない */ }
      if (!same) return;
      el.setAttribute("data-mu-src", src);
      el.removeAttribute("src");
    }
    el.type = BLOCKED;
  } else if (el instanceof HTMLLinkElement && el.rel === "modulepreload") el.remove();
}

/**
 * document_start から DOMContentLoaded まで、パーサーが足す元の script を無効にする。戻り値で止める。
 * MutationObserver は挿入の後に呼ばれるので、すぐ動く古い形の script は止めきれない。元のポータルの本体は type="module"
 * (HTML を読み終えてから動く)なので間に合う(実機で確認: 元の画面の部品は作られなかった)。元が同期の script に変われば止まらない
 */
export function blockNativeScripts(doc: Document): () => void {
  const scan = (n: Node) => {
    if (!(n instanceof Element)) return;
    neutralize(n);
    n.querySelectorAll(SEL).forEach(neutralize);
  };
  const mo = new MutationObserver((rs) => rs.forEach((r) => r.addedNodes.forEach(scan)));
  mo.observe(doc, { childList: true, subtree: true });
  doc.querySelectorAll(SEL).forEach(neutralize);
  const stop = () => mo.disconnect();
  doc.addEventListener("DOMContentLoaded", stop, { once: true });
  return stop;
}
