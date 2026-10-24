const KEY = "mu-news-unread";

/** 掲示の未読の数。ホームの「未読の掲示」と掲示板の「未読」タブで覚え、ほかのタブではそれを出す(タブで数が変わらないように) */
export function rememberedUnread(): number {
  try {
    return Number(sessionStorage.getItem(KEY)) || 0;
  } catch {
    return 0;
  }
}

export function rememberUnread(n: number): void {
  try {
    sessionStorage.setItem(KEY, String(n));
  } catch {
    // 覚えられなくても表示は続ける
  }
}

/** 覚えた数を増減する(0 未満にはしない) */
export const addUnread = (d: number): void => rememberUnread(Math.max(0, rememberedUnread() + d));
