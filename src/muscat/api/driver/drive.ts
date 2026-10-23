import { waitForAjax, type WaitOpts, type WaitResult } from "./busy";
import { setChecked, setValue } from "./fields";
import { resolveRef, type Ref } from "./locator";

/** click の ajax: 省略すると、要素から推定する(PrimeFaces.ab の onclick / commandlink / submit) */
export type DriveStep =
  | { kind: "set"; ref: Ref; value: string }
  | { kind: "check"; ref: Ref; checked: boolean }
  | { kind: "click"; ref: Ref; ajax?: boolean };

export const looksAjax = (el: HTMLElement) =>
  (el.getAttribute("onclick") ?? "").includes("PrimeFaces.ab") || el.classList.contains("ui-commandlink") || el.getAttribute("type") === "submit";

/**
 * 生きたページの要素を順に操作する。最初の step の前から通信を見張り、その結果を返す。
 * ref が見つからなければ、何も操作せずに Error。opts.expectAjax は step の ajax より優先。
 */
export async function drive(doc: Document, steps: DriveStep[], opts: WaitOpts = {}): Promise<WaitResult> {
  const els = steps.map((s) => {
    const el = resolveRef(doc, s.ref);
    if (!el) throw new Error(`要素が見つかりません: ${s.ref}`);
    return el;
  });
  const expectAjax = opts.expectAjax ?? steps.some((s, i) => s.kind === "click" && (s.ajax ?? looksAjax(els[i]!)));
  const wait = waitForAjax(doc, { ...opts, expectAjax });
  steps.forEach((s, i) => {
    const el = els[i]!;
    if (s.kind === "set") setValue(el as HTMLInputElement, s.value);
    else if (s.kind === "check") setChecked(el as HTMLInputElement, s.checked);
    else el.click();
  });
  return wait;
}
