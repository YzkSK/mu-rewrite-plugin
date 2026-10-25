// 本文HTMLは外部由来。許可リスト方式で、未知のタグは中身だけ残し、属性は表のものだけ通す
const ALLOW_TAGS = new Set("A B I U S EM STRONG SMALL SUB SUP MARK DEL INS BR HR P DIV SPAN UL OL LI DL DT DD BLOCKQUOTE PRE CODE H1 H2 H3 H4 H5 H6 TABLE THEAD TBODY TFOOT TR TD TH CAPTION IMG FONT".split(" "));
const DROP_TAGS = new Set(["SCRIPT", "STYLE", "IFRAME", "OBJECT", "EMBED", "LINK", "META", "FORM", "SVG", "MATH", "TEMPLATE", "NOSCRIPT"]);
const ALLOW_ATTRS: Record<string, string[]> = { A: ["href", "title"], IMG: ["src", "alt", "title", "width", "height"], TD: ["colspan", "rowspan"], TH: ["colspan", "rowspan"] };

// new URL で解釈するので、タブや改行を混ぜた "java\tscript:" も scheme として判定される
function isSafeUrl(u: string): boolean {
  try { return /^(https?|mailto):$/.test(new URL(u, location.href).protocol); } catch { return false; }
}

/** API由来のURLは http(s) だけを通す(javascript: 等の実行を防ぐ) */
export function isHttp(u: string): boolean {
  try { return /^https?:$/.test(new URL(u, location.href).protocol); } catch { return false; }
}

// 本文の style は文字の装飾だけ通す(position/z-index などで画面を覆えないようにする)
const STYLE_OK = new Set(["color", "background-color", "font-weight", "font-style", "text-decoration", "text-align"]);
function safeStyle(s: string): string {
  return s.split(";").map((d): [string, string | null] => { const i = d.indexOf(":"); return i < 0 ? [d, null] : [d.slice(0, i), d.slice(i + 1)]; })
    .filter(([p, v]) => v != null && STYLE_OK.has(p.trim().toLowerCase()) && /^[#a-z0-9(),.%\s-]+$/i.test(v.trim()))
    .map(([p, v]) => p.trim().toLowerCase() + ":" + v!.trim()).join(";");
}

function cleanNode(node: Element): void {
  for (const ch of [...node.childNodes]) {
    if (ch.nodeType === 3) continue;
    if (ch.nodeType !== 1 || DROP_TAGS.has((ch as Element).tagName)) { ch.remove(); continue; }
    const el = ch as Element;
    cleanNode(el);
    if (!ALLOW_TAGS.has(el.tagName)) { el.replaceWith(...el.childNodes); continue; }
    const tc = el.tagName === "SPAN" && el.getAttribute("data-text-color");
    const ok = ALLOW_ATTRS[el.tagName] ?? [];
    for (const a of [...el.attributes]) {
      const n = a.name.toLowerCase();
      const keep = ok.includes(n) || n === "style";
      if (!keep || ((n === "href" || n === "src") && !isSafeUrl(a.value))) el.removeAttribute(a.name);
    }
    const st = el.getAttribute("style");
    if (st != null) {
      const safe = safeStyle(st);
      if (safe) el.setAttribute("style", safe); else el.removeAttribute("style");
    }
    // 見出しの文字色は data-text-color で来る。形式を検証した値だけ style に変換する
    if (tc && /^#[0-9a-fA-F]{3,8}$/.test(tc)) el.setAttribute("style", "color:" + tc);
    if (el.tagName === "A") {
      el.setAttribute("target", "_blank");
      el.setAttribute("rel", "noopener noreferrer");
    }
  }
}

export function sanitize(html: string | null | undefined): string {
  const doc = new DOMParser().parseFromString(html || "", "text/html");
  cleanNode(doc.body);
  return doc.body.innerHTML;
}
