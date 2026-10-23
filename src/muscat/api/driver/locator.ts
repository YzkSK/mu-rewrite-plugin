export type Ref = string;

const ACTIONABLE = "input, select, textarea, button, a[onclick]";
const REF = /^c(\d+)$/;
const counters = new WeakMap<Document, number>();

const excluded = (e: Element) => {
  const name = e.getAttribute("name") ?? "";
  return name.startsWith("rx-") || /ViewState/i.test(name) || e.id.includes("ViewState");
};

/** 操作できる要素に data-mu-ref="c<連番>" を付ける。付いていれば付け直さない。連番はページ内で一意 */
export function assignRefs(root: ParentNode): void {
  const doc = (root as Node).ownerDocument ?? (root as Document);
  let n = counters.get(doc) ?? 0;
  for (const e of doc.querySelectorAll("[data-mu-ref]")) n = Math.max(n, Number(REF.exec(e.getAttribute("data-mu-ref") ?? "")?.[1] ?? 0));
  for (const e of root.querySelectorAll(ACTIONABLE)) {
    if (e.hasAttribute("data-mu-ref") || excluded(e)) continue;
    e.setAttribute("data-mu-ref", `c${++n}`);
  }
  counters.set(doc, n);
}

export function resolveRef(doc: Document, ref: Ref): HTMLElement | null {
  return REF.test(ref) ? doc.querySelector<HTMLElement>(`[data-mu-ref="${ref}"]`) : null;
}
