// MUSCAT の HTML から時間割を取るための読み取り。Service Worker には DOMParser が無いので正規表現で読む(DOM は使わない)

const NAMED = { amp: "&", quot: '"', apos: "'", lt: "<", gt: ">", nbsp: " " };

/** &amp; &quot; &#39; &#x27; などを戻す */
const decode = (s) =>
  s.replace(/&(?:#(\d+)|#x([0-9a-f]+)|([a-z]+));/gi, (m, d, h, n) =>
    d ? String.fromCodePoint(+d) : h ? String.fromCodePoint(parseInt(h, 16)) : (NAMED[n.toLowerCase()] ?? m));

/** タグ 1 つ分の文字から属性を Map にする(名前は小文字、値は実体参照を戻す) */
function attrsOf(tag) {
  const out = new Map();
  const body = tag.replace(/^<\w+/, "");
  for (const m of body.matchAll(/([^\s=\/>"']+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g)) {
    out.set(m[1].toLowerCase(), decode(m[2] ?? m[3] ?? m[4] ?? ""));
  }
  return out;
}

// 引用符の中の > でタグを切らない
const tagRe = (name) => new RegExp(`<${name}\\b(?:"[^"]*"|'[^']*'|[^>"'])*>`, "gi");

/** id の合う <form> の { open: 開きタグの属性, body: 中身 }。無ければ null */
function formBlock(html, id) {
  for (const m of html.matchAll(tagRe("form"))) {
    const attrs = attrsOf(m[0]);
    if (attrs.get("id") !== id) continue;
    const from = m.index + m[0].length;
    const end = html.indexOf("</form>", from);
    return { attrs, body: html.slice(from, end < 0 ? html.length : end) };
  }
  return null;
}

/** <form id="..."> の { action, fields: [name, value][] }。submit/button/image と、チェックの無い checkbox/radio は除く */
export function formOf(html, id) {
  const f = formBlock(html, id);
  if (!f) return null;
  const fields = [];
  for (const m of f.body.matchAll(tagRe("input"))) {
    const a = attrsOf(m[0]);
    const type = (a.get("type") ?? "text").toLowerCase();
    if (!a.get("name") || ["submit", "button", "image"].includes(type)) continue;
    if ((type === "checkbox" || type === "radio") && !a.has("checked")) continue;
    fields.push([a.get("name"), a.get("value") ?? ""]);
  }
  return { action: f.attrs.get("action") ?? "", fields };
}

/** menuForm の中で、テキストが label のリンクの data-pfconfirmcommand からメニュー ID を読む。無ければ null */
export function menuIdOf(html, label) {
  const f = formBlock(html, "menuForm");
  if (!f) return null;
  for (const m of f.body.matchAll(/(<a\b(?:"[^"]*"|'[^']*'|[^>"'])*>)([\s\S]*?)<\/a>/gi)) {
    if (decode(m[2].replace(/<[^>]*>/g, "")).trim() !== label) continue;
    const id = /'menuForm:mainMenu_menuid':'((?:[^'\\]|\\.)*)'/.exec(attrsOf(m[1]).get("data-pfconfirmcommand") ?? "")?.[1];
    if (id !== undefined) return id.replace(/\\(.)/g, "$1"); // ハイフンが \- とエスケープされている
  }
  return null;
}
