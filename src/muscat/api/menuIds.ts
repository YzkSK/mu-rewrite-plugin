import type { MenuIds, MenuLabel } from "./session";

const ID_IN_COMMAND = /'menuForm:mainMenu_menuid':'((?:[^'\\]|\\.)*)'/;

/**
 * メニューリンクの data-pfconfirmcommand に書かれたメニュー ID を読む。
 * リンクをクリックしない(拡張機能の隔離された環境では submit の差し替えが効かず、本物の画面遷移になるため)。
 * ID はログインごとに変わり、ハイフンが `\-` とエスケープされているので戻す。
 */
export function readMenuIds(doc: Document): MenuIds {
  const ids: MenuIds = {};
  for (const a of doc.querySelectorAll<HTMLElement>("#menuForm a[data-pfconfirmcommand]")) {
    const m = ID_IN_COMMAND.exec(a.getAttribute("data-pfconfirmcommand") ?? "");
    if (m?.[1] !== undefined) ids[(a.textContent ?? "").trim() as MenuLabel] = m[1].replace(/\\(.)/g, "$1");
  }
  return ids;
}
