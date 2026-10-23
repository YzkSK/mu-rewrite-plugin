/** メニュー(#menuForm)ではなく、ヘッダーのリンクで開く項目 */
export const SETTING_LABEL = "個人設定";

/** ヘッダーの個人設定リンク(id に commandlink を含むものはログアウトなど別のリンク) */
const findSetting = (doc: Document) =>
  [...doc.querySelectorAll<HTMLElement>("#headerForm nav a.ui-link.headerBtn")].find((a) => !a.id.includes("commandlink"));

const clickOf = (el: HTMLElement | null | undefined): boolean => (el ? (el.click(), true) : false);

/** ヘッダーのホームのリンク */
export const nativeHome = (doc: Document): boolean => clickOf(doc.querySelector<HTMLElement>("#headerForm header a.ui-link"));

/** ヘッダーのログアウトボタン */
export const nativeLogout = (doc: Document): boolean => clickOf(doc.getElementById("headerForm:logoutButton"));

/** 元の #menuForm のリンクのうち、表示テキストが label のものをクリックして画面を移る。個人設定はヘッダーのリンク。見つからなければ何もせず false。 */
export function nativeNav(doc: Document, label: string): boolean {
  if (label === SETTING_LABEL) return clickOf(findSetting(doc));
  const a = [...doc.querySelectorAll<HTMLElement>("#menuForm a")].find((x) => (x.textContent ?? "").trim() === label);
  return clickOf(a);
}
