export type MenuGroup = { title: string; labels: string[] };

/** 元のメニュー(#menuForm:mainMenu)の「グループ > 項目」を、表示順のまま読む。クリックはしない。 */
export function readMenuGroups(doc: Document): MenuGroup[] {
  const tops = [...doc.querySelectorAll<HTMLElement>("#menuForm\\:mainMenu li.ui-menuitem.ui-menu-parent")].filter(
    (li) => !li.parentElement?.closest("li.ui-menuitem"),
  );
  return tops
    .map((li) => ({
      title: (li.querySelector(":scope > a")?.textContent ?? "").trim(),
      labels: [...li.querySelectorAll<HTMLElement>("li.ui-menuitem:not(.ui-widget-header) a")]
        .filter((a) => a.closest("li") !== li)
        .map((a) => (a.textContent ?? "").trim())
        .filter(Boolean),
    }))
    .filter((g) => g.title && g.labels.length);
}
