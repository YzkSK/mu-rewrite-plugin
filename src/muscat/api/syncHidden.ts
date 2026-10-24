/**
 * 生きたページの各フォームの hidden を、fresh の同じ id のフォームの同じ name の値に写す。
 * 別の Document で画面を動かすとサーバーの状態(ViewState など)が進み、生きたページの元の部品が効かなくなるため
 */
export function syncHidden(live: Document, fresh: Document, only?: string[]): void {
  for (const form of live.querySelectorAll("form")) {
    if (!form.id || (only && !only.includes(form.id))) continue;
    const src = fresh.getElementById(form.id);
    if (!src) continue;
    for (const input of form.querySelectorAll<HTMLInputElement>('input[type="hidden"]')) {
      const from = [...src.querySelectorAll<HTMLInputElement>('input[type="hidden"]')].find((i) => i.name === input.name);
      if (from) input.value = from.value;
    }
  }
}
