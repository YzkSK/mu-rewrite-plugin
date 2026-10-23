import type { MenuIds, MenuLabel } from "./session";

/**
 * ライブの DOM のメニューリンクをクリックし、送られるはずだったメニュー ID を読む。
 * submit は一時的に差し替えて、実際には送らない。
 */
export async function readMenuIds(doc: Document): Promise<MenuIds> {
  const proto = HTMLFormElement.prototype;
  const original = proto.submit;
  const ids: MenuIds = {};
  let current = "";
  proto.submit = function (this: HTMLFormElement) {
    const el = this.elements.namedItem("menuForm:mainMenu_menuid") as HTMLInputElement | null;
    if (current && el) ids[current as MenuLabel] = el.value;
  };
  try {
    const links = doc.querySelectorAll<HTMLElement>('#menuForm a[onclick*="confirmIfModified"]');
    for (const a of links) {
      current = (a.textContent ?? "").trim();
      a.click();
    }
  } finally {
    proto.submit = original;
  }
  return ids;
}
