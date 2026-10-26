export type Ref = string;

// タブの切り替えは jQuery が a に結び付けていて onclick が無いので、タブの a も操作できる要素にする
export const ACTIONABLE = "input, select, textarea, button, a[onclick], .ui-tabs-nav a, a.ui-commandlink, div.ui-selectbooleanbutton";
const REF = /^c(\d+)$/;
const counters = new WeakMap<Document, number>();

const excluded = (e: Element) => {
  const name = e.getAttribute("name") ?? "";
  return name.startsWith("rx-") || /ViewState/i.test(name) || e.id.includes("ViewState");
};

/**
 * これまでに付けた最大の連番。ページ全体を数えるのは、そのページで最初の 1 回だけ(以後は覚えた数の続き。連番は増える一方なので重ならない)。
 * 毎回数えると、印の付いた要素が数千ある画面(教室予約)で 1 回の読み取りに何秒もかかった(実機で測定)
 */
function maxRef(doc: Document): number {
  const known = counters.get(doc);
  if (known !== undefined) return known;
  let n = 0;
  for (const e of doc.querySelectorAll("[data-mu-ref]")) n = Math.max(n, Number(REF.exec(e.getAttribute("data-mu-ref") ?? "")?.[1] ?? 0));
  return n;
}

/** その要素 1 つに ref を付けて返す。付いていればそれを返す(ACTIONABLE の外の要素用) */
export function assignRef(el: Element): Ref {
  const cur = el.getAttribute("data-mu-ref");
  if (cur) return cur;
  const n = maxRef(el.ownerDocument) + 1;
  el.setAttribute("data-mu-ref", `c${n}`);
  counters.set(el.ownerDocument, n);
  return `c${n}`;
}

/** 操作できる要素に data-mu-ref="c<連番>" を付ける。付いていれば付け直さない。連番はページ内で一意 */
export function assignRefs(root: ParentNode): void {
  const doc = (root as Node).ownerDocument ?? (root as Document);
  let n = maxRef(doc);
  for (const e of root.querySelectorAll(ACTIONABLE)) {
    if (e.hasAttribute("data-mu-ref") || excluded(e)) continue;
    e.setAttribute("data-mu-ref", `c${++n}`);
  }
  counters.set(doc, n);
}

export function resolveRef(doc: Document, ref: Ref): HTMLElement | null {
  return REF.test(ref) ? doc.querySelector<HTMLElement>(`[data-mu-ref="${ref}"]`) : null;
}
