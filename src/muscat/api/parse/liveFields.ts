import { assignRef } from "../driver/locator";
import type { CheckOption, SelectField, TextField } from "../types";
import { squash } from "./genericControls";

export const refOf = (el: Element | null | undefined) => (el ? assignRef(el) : "");

export const textField = (el: Element | null | undefined): TextField => ({
  ref: refOf(el),
  value: (el as HTMLInputElement | null)?.value ?? "",
});

/** PrimeFaces の selectonemenu の裏にある素の select を読む */
export const selectField = (el: Element | null | undefined): SelectField => {
  const sel = el as HTMLSelectElement | null | undefined;
  return {
    ref: refOf(sel),
    value: sel?.value ?? "",
    options: sel ? [...sel.options].map((o) => ({ value: o.value, label: squash(o.textContent) })) : [],
  };
};

/** チェックボックス群。操作は見えている枠(.ui-chkbox-box)を click する(PrimeFaces は枠に結び付けている) */
export const checkOptions = (root: ParentNode, name: string): CheckOption[] =>
  [...root.querySelectorAll<HTMLInputElement>(`input[type="checkbox"][name="${name}"]`)].map((input) => {
    const box = input.closest(".ui-chkbox")?.querySelector(".ui-chkbox-box") ?? input;
    return {
      label: squash(input.closest("td")?.querySelector("label")?.textContent),
      ref: assignRef(box),
      checked: input.checked || box.classList.contains("ui-state-active"),
    };
  });

export const buttonByText = (root: ParentNode, text: string) =>
  [...root.querySelectorAll("button")].find((b) => squash(b.textContent) === text) ?? null;
