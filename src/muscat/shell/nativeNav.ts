/** 元の #menuForm のリンクのうち、表示テキストが label のものをクリックして画面を移る。見つからなければ何もしない。 */
export function nativeNav(doc: Document, label: string): void {
  for (const a of doc.querySelectorAll<HTMLElement>("#menuForm a")) {
    if ((a.textContent ?? "").trim() === label) {
      a.click();
      return;
    }
  }
}
