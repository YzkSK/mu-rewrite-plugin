/** メニュー(#menuForm)ではなく、ヘッダーのリンクで開く項目 */
export const SETTING_LABEL = "個人設定";

/** ヘッダーの個人設定リンク(id に commandlink を含むものはログアウトなど別のリンク) */
const findSetting = (doc: Document) =>
  [...doc.querySelectorAll<HTMLElement>("#headerForm nav a.ui-link.headerBtn")].find((a) => !a.id.includes("commandlink"));

/** 元の #menuForm のリンクのうち、表示テキストが label のものをクリックして画面を移る。個人設定はヘッダーのリンク。見つからなければ何もしない。 */
export function nativeNav(doc: Document, label: string): void {
  if (label === SETTING_LABEL) return findSetting(doc)?.click();
  for (const a of doc.querySelectorAll<HTMLElement>("#menuForm a")) {
    if ((a.textContent ?? "").trim() === label) {
      a.click();
      return;
    }
  }
}
