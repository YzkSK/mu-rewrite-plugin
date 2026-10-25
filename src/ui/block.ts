const BLOCKED = "text/x-mu-blocked";
const SEL = "script, link[rel=modulepreload]";

/** 元のアプリの script を実行前に無効にする(同一オリジンの src か、中身だけの script)。modulepreload も消す */
function neutralize(el: Element): void {
  if (el instanceof HTMLScriptElement) {
    if (el.type === BLOCKED) return;
    const type = el.getAttribute("type");
    const src = el.getAttribute("src");
    if (src !== null) {
      let same = false;
      try { same = new URL(src, location.href).origin === location.origin; } catch { /* 読めない URL は触らない */ }
      if (!same) return;
      el.setAttribute("data-mu-src", src);
      el.removeAttribute("src");
    }
    if (type !== null) el.setAttribute("data-mu-type", type); // 元に戻すときのため
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

/**
 * 止めた script を元の type・src で作り直して動かす(描かないと決めたページ=ログイン・中継ページなど、元の画面にそのまま働かせる場合)。
 * 文書の順に 1 つずつ動かす(外部のものは読み込みを待つ。読めなくても続ける)
 */
export async function unblockNativeScripts(doc: Document): Promise<void> {
  for (const old of [...doc.querySelectorAll<HTMLScriptElement>(`script[type="${BLOCKED}"]`)]) {
    const next = doc.createElement("script");
    for (const a of old.attributes) if (!["type", "data-mu-src", "data-mu-type"].includes(a.name)) next.setAttribute(a.name, a.value);
    const type = old.getAttribute("data-mu-type");
    if (type !== null) next.setAttribute("type", type);
    const src = old.getAttribute("data-mu-src");
    if (src !== null) next.src = src;
    else next.textContent = old.textContent;
    const loaded = src === null ? null : new Promise<void>((r) => { next.addEventListener("load", () => r(), { once: true }); next.addEventListener("error", () => r(), { once: true }); });
    old.replaceWith(next);
    await loaded;
  }
}
