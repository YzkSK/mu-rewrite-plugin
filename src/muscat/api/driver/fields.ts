/** 値を入れて input / change を飛ばす(ページ側の onchange が動く) */
export function setValue(el: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement, value: string): void {
  el.value = value;
  el.dispatchEvent(new Event("input", { bubbles: true }));
  el.dispatchEvent(new Event("change", { bubbles: true }));
}

/** 状態が違うときだけ click する(ラジオ・チェックボックス) */
export function setChecked(el: HTMLInputElement, checked: boolean): void {
  if (el.checked !== checked) el.click();
}

/** name と value が一致するラジオを選ぶ。無ければ Error */
export function pickRadio(doc: Document, name: string, value: string): void {
  const radio = [...doc.querySelectorAll<HTMLInputElement>('input[type="radio"]')].find((r) => r.name === name && r.value === value);
  if (!radio) throw new Error(`ラジオがありません: ${name}=${value}`);
  setChecked(radio, true);
}
