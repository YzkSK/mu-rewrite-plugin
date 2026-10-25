/** 値を入れて input / change を飛ばす(ページ側の onchange が動く) */
export function setValue(el: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement, value: string): void {
  el.value = value;
  el.dispatchEvent(new Event("input", { bubbles: true }));
  // 元の画面の日付欄(PrimeFaces DatePicker)は、拡張から送った input の処理で前の日付に戻すことがある(教室予約の終了日。実機で確認)ので入れ直す
  if (el.value !== value) el.value = value;
  el.dispatchEvent(new Event("change", { bubbles: true }));
  if (el.value !== value) el.value = value;
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
