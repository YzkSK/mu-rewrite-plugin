export type Req = { url: string; body: URLSearchParams; headers?: Record<string, string> };

/** 元の PrimeFaces.ab が送る部分更新のヘッダー(実機で記録) */
export const PARTIAL_HEADERS: Record<string, string> = {
  "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
  "Faces-Request": "partial/ajax",
  "X-Requested-With": "XMLHttpRequest",
  Accept: "application/xml, text/xml, */*; q=0.01",
};

/**
 * Document ごとの基準 URL。元のブラウザの URL は画面を移っても変わらない(自前で移るため)ので、相対の action はその Document が
 * 元の画面なら居たはずの URL に対して解決する。ページの応答は最後の応答の URL、ViewRoot の置き換えはその ab を送った URL。付けなければ今のページの URL
 */
const bases = new WeakMap<Document, string>();
export const setBase = (doc: Document, url: string): void => void bases.set(doc, url);
export const baseOf = (doc: Document): string => bases.get(doc) ?? location.href;

/** フォームの送り先(action をその Document の基準 URL に対して解決する) */
export const actionOf = (form: Element): string => new URL(form.getAttribute("action") ?? "", baseOf(form.ownerDocument)).href;

/** FormData のすべての項目(DOM の順。disabled・未チェックは FormData が除く)を body に足す */
export function appendFields(body: URLSearchParams, form: HTMLFormElement): void {
  for (const [k, v] of new FormData(form)) if (typeof v === "string") body.append(k, v);
}

/**
 * 元の画面の PrimeFaces.addSubmitParam('form',{名前:値,...}).submit('form')(ajax ではないリンク。パンくずの項目など)と同じ、画面ごと替わる POST。
 * 隠し項目を足してから送るので、フォームの全項目のあとに params。syncTransition('id') が付く場合は、最後に rx.sync.source=id
 */
export function submitRequest(form: HTMLFormElement, params: Record<string, string>, syncSource?: string): Req {
  const body = new URLSearchParams();
  appendFields(body, form);
  for (const [k, v] of Object.entries(params)) body.append(k, v);
  if (syncSource) body.append("rx.sync.source", syncSource);
  return { url: actionOf(form), body };
}

/**
 * 画面ごと替わる POST(ホーム・個人設定など。ajax ではない)。フォームの全項目 + `<source>=`(空)+ rx.sync.source。
 * 元のサイトの syncTransition が付ける項目と同じ(実機で記録)
 */
export function pageRequest(form: HTMLFormElement, source: string): Req {
  const body = new URLSearchParams();
  appendFields(body, form);
  body.append(source, "");
  body.append("rx.sync.source", source);
  return { url: actionOf(form), body };
}
