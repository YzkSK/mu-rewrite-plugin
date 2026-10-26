/** 元のページに「対象のデータが存在しません。」しか無いか(回答が必要な安否確認が無いとき。実機で確認) */
export function nothingToAnswer(doc: Document): boolean {
  const form = doc.getElementById("funcForm");
  return !!form && /対象のデータが存在しません/.test(form.textContent ?? "") && !form.querySelector('input:not([type="hidden"]), select, textarea, button, table');
}
