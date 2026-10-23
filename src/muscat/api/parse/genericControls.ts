import type { GControl } from "../types";

/** assignRefs が操作できる要素に付けた印(= 操作部品の全部) */
const REF_SEL = "[data-mu-ref]";

export const squash = (s: string | null | undefined) => (s ?? "").replace(/\s+/g, " ").trim();

/** 画面に出さない要素(隠し・PrimeFaces が作る補助の見た目) */
export const SKIP =
  'script, style, .ui-helper-hidden, [style*="display:none"], [style*="display: none"], .ui-selectonemenu-panel, .ui-selectonemenu-label, ' +
  ".ui-selectonemenu-label-container, .ui-selectonemenu-trigger, .ui-chkbox-box, .ui-radiobutton-box, .ui-icon";
const HIDDEN = '.ui-helper-hidden, [style*="display:none"], [style*="display: none"], .ui-selectonemenu-panel';
const DROP = `${SKIP}, select, textarea, button, a[onclick]`;

/** 要素の文字。操作部品の文字は含めない。stripLabels なら、部品に付いた label も除く */
export function textOf(el: Element, stripLabels = false): string {
  const c = el.cloneNode(true) as Element;
  c.querySelectorAll(DROP).forEach((n) => n.remove());
  // アイコンだけのボタンは、文字がクラス名 "ui-button" になる
  c.querySelectorAll(".ui-button-text").forEach((n) => squash(n.textContent) === "ui-button" && n.remove());
  if (stripLabels) {
    const doc = el.ownerDocument;
    c.querySelectorAll("label[for]").forEach((l) => doc.getElementById(l.getAttribute("for")!)?.matches(REF_SEL) && l.remove());
  }
  return squash(c.textContent);
}

function labelOf(el: Element): string {
  const doc = el.ownerDocument;
  const base = el.id.replace(/_input$/, "");
  const ids = el.id ? [el.id, base, `${base}_focus`] : [];
  const label = [...doc.getElementsByTagName("label")].find((l) => ids.includes(l.getAttribute("for") ?? ""));
  if (label) return squash(label.textContent);
  for (let n: Element | null = el, i = 0; n && i < 3; n = n.parentElement, i++) {
    const prev = n.previousElementSibling;
    if (prev?.matches(".ui-outputlabel")) return squash(prev.textContent);
  }
  const dt = el.closest("dd")?.previousElementSibling;
  return squash(el.getAttribute("aria-label") || el.getAttribute("title") || (dt?.tagName === "DT" ? dt.textContent : ""));
}

function controlOf(el: Element): GControl | null {
  const ref = el.getAttribute("data-mu-ref");
  if (!ref || el.closest(HIDDEN)) return null;
  const disabled = el.hasAttribute("disabled") || !!el.closest(".ui-state-disabled");
  const label = labelOf(el);
  if (el instanceof HTMLSelectElement) {
    const options = [...el.options].map((o) => ({ value: o.value, label: squash(o.textContent) }));
    return { kind: "select", ref, label, value: el.value, options, disabled };
  }
  if (el instanceof HTMLTextAreaElement) return { kind: "textarea", ref, label, value: el.value, disabled };
  if (el instanceof HTMLInputElement) {
    const t = el.type;
    if (t === "hidden" || el.closest(".ui-selectonemenu")) return null; // 見た目の補助(_focus)。本体は中の select
    if (t === "checkbox") return { kind: "checkbox", ref, label, checked: el.checked, disabled };
    if (t === "radio") return { kind: "radio", ref, name: el.name, label, value: el.value, checked: el.checked, disabled };
    if (["submit", "button", "image", "reset"].includes(t)) return { kind: "button", ref, label: squash(el.value || el.alt) || label, disabled };
    return { kind: "text", ref, label, value: el.value, disabled };
  }
  return { kind: "button", ref, label: textOf(el) || label, disabled };
}

/** root の中(root 自身を含む)の操作部品を文書順に */
export function controlsIn(root: Element): GControl[] {
  const all = root.matches(REF_SEL) ? [root] : [...root.querySelectorAll(REF_SEL)];
  return all.flatMap((e) => controlOf(e) ?? []);
}
