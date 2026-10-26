type Runtime = { sendMessage(msg: object, cb: (r?: Record<string, unknown>) => void): void; lastError?: unknown };

/** background.js へ送る。拡張の再読み込み直後などの例外・lastError は握りつぶして fallback を返す */
function send(msg: object, fallback: Record<string, unknown> = {}): Promise<Record<string, unknown>> {
  return new Promise((resolve) => {
    try {
      const rt = (globalThis as { chrome?: { runtime?: Runtime } }).chrome?.runtime;
      if (!rt) return resolve(fallback);
      rt.sendMessage(msg, (r) => resolve(rt.lastError || !r ? fallback : r));
    } catch {
      resolve(fallback);
    }
  });
}

/** 開いている画面の葉(メニューのラベル)を記録する。ホームは "" で記録を消す */
export const reportScreen = (leaf: string): void => void send({ type: "mu-screen", leaf });

/** 入り直した直後なら直前の画面の葉を返す。無ければ "" */
export const askRestore = async (): Promise<string> => String((await send({ type: "mu-restore" })).leaf ?? "");

/** 入り直しの印を付けてもらう */
export const reportBounce = async (): Promise<void> => void (await send({ type: "mu-bounce" }));

/** 入り直しの途中か */
export const isBouncing = async (): Promise<boolean> => (await send({ type: "mu-bouncing" })).on === true;
