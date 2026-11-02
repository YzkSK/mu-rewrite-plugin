import type { Node } from "@milkdown/kit/prose/model";

// 利用者ごとに分ける(同じタブで別の人がログインし直しても前の人の書きかけが出ない)
const key = (user: string, id: number | string | null) => `mu-lms-draft-${user}-${id}`;
export const load = (user: string, id: number | string | null): string | null => { try { return sessionStorage.getItem(key(user, id)); } catch { return null; } };
export const save = (user: string, id: number | string | null, v: string | null): void => {
  try { if (v === null) sessionStorage.removeItem(key(user, id)); else sessionStorage.setItem(key(user, id), v); } catch { /* 保存できなくても書ける */ }
};
/** doc を書きかけとして保存し、古い版の書きかけ(id に文字で持っていたもの)を消す */
export const saveDocDraft = (user: string, id: number | null, doc: Node): void => {
  save(user, `${id}-doc`, JSON.stringify(doc.toJSON()));
  save(user, id, null);
};
