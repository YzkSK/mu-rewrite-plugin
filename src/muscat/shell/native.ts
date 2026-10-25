/** 「元の画面で開く」の印(sessionStorage)。値は付けた時刻。付いている間は、この拡張は MUSCAT を描かず・元の script も止めない */
export const NATIVE_KEY = "mu-muscat-native";
/** 元の画面は入口(SSO)から入り直す。ここへ着いた読み込みで、印の新しさを見る */
export const NATIVE_ENTRY = "/uprx/ShibbolethAuthServlet";
const FRESH_MS = 10_000;

type Store = Pick<Storage, "getItem" | "setItem" | "removeItem">;

/** 印を付けて入口へ移る(次の読み込みで entry が印を見て、拡張を働かせない) */
export function openNative(storage: Store, now: number, assign: (url: string) => void): void {
  try {
    storage.setItem(NATIVE_KEY, String(now));
  } catch {
    /* 付けられなくても入口へは移る */
  }
  assign(NATIVE_ENTRY);
}

export type Mode = "skip" | "native" | "app";

/**
 * その読み込みでの拡張の働き方。/uprx/ の外は skip、印があれば native(何もしない)、それ以外は app。
 * 印の消し方: 入口(ShibbolethAuthServlet)の読み込みで、印が 10 秒以内に付いたものでなければ消す
 * (「元の画面で開く」直後の読み込みは残し、ポータルなどから入り直してきたときは app に戻る)。入口以外の読み込みでは消さない
 */
export function muscatMode(pathname: string, storage: Store, now: number): Mode {
  if (!pathname.startsWith("/uprx/")) return "skip";
  try {
    const at = Number(storage.getItem(NATIVE_KEY)) || 0;
    if (!at) return "app";
    if (pathname === NATIVE_ENTRY && now - at >= FRESH_MS) {
      storage.removeItem(NATIVE_KEY);
      return "app";
    }
    return "native";
  } catch {
    return "app"; // sessionStorage が使えなければ印は読めない
  }
}
