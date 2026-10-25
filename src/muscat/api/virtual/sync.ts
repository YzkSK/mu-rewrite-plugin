const KEEP = /^(rx[-.]|jakarta\.faces\.ViewState$)/;

/**
 * 取り直したホーム(fresh)の rx-* と ViewState の隠し項目を、見せているホーム(shown)の同じ id のフォームへ写す(Document は差し替えない)。
 * 別の画面を POST したあと、ホームの元のボタンは取り直したホームの値でないと効かない(実機で確認)。画面の ref や開いている状態は変えない
 */
export function copyStateFields(shown: Document, fresh: Document): void {
  for (const f of fresh.querySelectorAll("form[id]")) {
    const target = shown.getElementById(f.id);
    if (target?.tagName !== "FORM") continue;
    for (const src of f.querySelectorAll<HTMLInputElement>("input[name]")) {
      if (!KEEP.test(src.name)) continue;
      const mine = [...target.querySelectorAll<HTMLInputElement>("input[name]")].find((i) => i.name === src.name);
      if (mine) {
        mine.value = src.value;
        mine.setAttribute("value", src.value);
      } else target.appendChild(shown.importNode(src, true));
    }
  }
}
