import { waitForAjax, type WaitOpts, type WaitResult } from "./busy";
import { setChecked, setValue } from "./fields";
import { resolveRef, type Ref } from "./locator";

export type DriveStep =
  | { kind: "set"; ref: Ref; value: string }
  | { kind: "check"; ref: Ref; checked: boolean }
  | { kind: "click"; ref: Ref };

/**
 * 生きたページの要素を順に操作する。最後の step の直前から通信を見張り、その結果を返す。
 * ref が見つからなければ、何も操作せずに Error。
 */
export async function drive(doc: Document, steps: DriveStep[], opts?: WaitOpts): Promise<WaitResult> {
  const els = steps.map((s) => {
    const el = resolveRef(doc, s.ref);
    if (!el) throw new Error(`要素が見つかりません: ${s.ref}`);
    return el;
  });
  let wait: Promise<WaitResult> = Promise.resolve("none");
  steps.forEach((s, i) => {
    if (i === steps.length - 1) wait = waitForAjax(doc, opts);
    const el = els[i]!;
    if (s.kind === "set") setValue(el as HTMLInputElement, s.value);
    else if (s.kind === "check") setChecked(el as HTMLInputElement, s.checked);
    else el.click();
  });
  return wait;
}
