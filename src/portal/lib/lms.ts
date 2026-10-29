/** background の mu-lms-due が返す形 */
/** closed: 期限切れで締め切られた(もう出せない) */
export type LmsDue = { name: string; course: string; due: number; overdue: boolean; closed?: boolean; url: string; kind?: string };
export type LmsResult = { login: false } | { login: true; events: LmsDue[] } | { error: string };

/** 「03_【課題提出先】」の提出期限 → 03_【課題提出先】(合わなければそのまま) */
export const dueName = (s: string): string => /^「(.+)」の提出期限$/.exec(s)?.[1] ?? s;

/** "399 英語基礎C [Re_a]" → "英語基礎C [Re_a]" */
export const courseName = (s: string): string => s.replace(/^\d+\s+/, "");

type Runtime = { sendMessage(msg: object, cb: (r?: LmsResult) => void): void; lastError?: { message?: string } };

/** Service Worker にお願いして LMS の提出期限を取る。拡張の外・失敗は error */
export function fetchLmsDue(): Promise<LmsResult> {
  return new Promise((resolve) => {
    try {
      const rt = (globalThis as { chrome?: { runtime?: Runtime } }).chrome?.runtime;
      if (!rt?.sendMessage) return resolve({ error: "no runtime" });
      rt.sendMessage({ type: "mu-lms-due" }, (r) => resolve(rt.lastError || !r ? { error: rt.lastError?.message ?? "no response" } : r));
    } catch (e) {
      resolve({ error: String(e) });
    }
  });
}
