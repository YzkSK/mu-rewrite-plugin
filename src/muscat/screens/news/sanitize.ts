const KEEP = new Set("p br a strong b em i u ul ol li span div table thead tbody tr th td h1 h2 h3 h4 h5 h6 hr blockquote pre code".split(" "));
const DROP = new Set("script style iframe object embed form input button img svg math template textarea select noscript".split(" "));
const SAFE_HREF = /^(https?:|mailto:)/i;

function clean(parent: Node): void {
  for (const node of [...parent.childNodes]) {
    if (node.nodeType !== 1) {
      if (node.nodeType !== 3) parent.removeChild(node); // コメントなど
      continue;
    }
    const el = node as Element;
    const tag = el.tagName.toLowerCase();
    if (DROP.has(tag)) {
      parent.removeChild(el);
      continue;
    }
    clean(el);
    if (!KEEP.has(tag)) {
      // 許可しないタグは、中身だけ残して外す
      while (el.firstChild) parent.insertBefore(el.firstChild, el);
      parent.removeChild(el);
      continue;
    }
    const href = tag === "a" ? el.getAttribute("href")?.trim() : undefined;
    for (const a of [...el.attributes]) el.removeAttribute(a.name);
    if (href && SAFE_HREF.test(href)) {
      el.setAttribute("href", href);
      el.setAttribute("target", "_blank");
      el.setAttribute("rel", "noopener noreferrer");
    }
  }
}

/** 掲示の本文(リッチテキスト)を、表示してよい形だけにする。許可タグ以外は中身だけ残し、属性は a の href だけ */
export function sanitizeNewsHtml(html: string): string {
  // template の中身は文書につながらないので、iframe や img を読み込まない(DOMParser だとテストの happy-dom が
  // iframe を読もうとして、裏で別のテストを落としていた)
  const t = document.createElement("template");
  t.innerHTML = html;
  clean(t.content);
  return t.innerHTML;
}
