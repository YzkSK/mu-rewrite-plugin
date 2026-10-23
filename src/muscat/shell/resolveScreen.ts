import { genericScreen, SCREENS, type ScreenDef } from "./screens";

const CODE = /\[[A-Z][a-z]{2}\d{3}\]/g;

/** メニューのある、ログイン済みの MUSCAT の画面か */
export const isLoggedIn = (doc: Document): boolean => !!(doc.getElementById("menuForm:mainMenu") && doc.getElementById("wrap"));

/** ホーム(コード Pky001、またはコードが無く #portalCont がある) */
export const isHomeScreen = (code: string, doc: Document): boolean => code === "Pky001" || (!code && !!doc.getElementById("portalCont"));

/** 見出しの題名。`[Xxx000]` と余分な空白を除く。取れなければ「MUSCAT」 */
export function screenTitleOf(doc: Document): string {
  const text = doc.getElementById("mainWrapTop")?.textContent ?? "";
  return text.replace(CODE, "").replace(/\s+/g, " ").trim() || "MUSCAT";
}

/** 登録済みならその定義、ログイン済みの未登録画面なら汎用画面、それ以外(ログイン画面・中継ページ)は null */
export function resolveScreen(code: string, doc: Document): ScreenDef | null {
  if (Object.hasOwn(SCREENS, code)) return SCREENS[code] ?? null;
  if (!isLoggedIn(doc)) return null;
  return genericScreen(isHomeScreen(code, doc) ? "ホーム" : screenTitleOf(doc));
}
