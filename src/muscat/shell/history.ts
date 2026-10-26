/** 画面が替わったとき履歴をどうするか。最初の画面は今のエントリを書き換え、あとは積む。同じ画面のままなら何もしない */
export function screenHistoryOp(prev: string | null, label: string | undefined): "replace" | "push" | null {
  if (!label || label === prev) return null;
  return prev === null ? "replace" : "push";
}

// 積んだエントリに通し番号 i を付け、戻る・進むのどちら向きに着いたかを見分ける(持ち主のいない sub を同じ向きに飛ばすため)
let at = 0;

/** 履歴に積む。履歴を触れなくても動くよう失敗は無視する */
export function pushEntry(state: object): void {
  try {
    history.pushState({ ...state, i: at + 1 }, "");
    at++;
  } catch {
    /* 履歴を触れなくても動く */
  }
}

/** 今のエントリを書き換える(元の state のキーは残す) */
export function replaceEntry(state: object): void {
  try {
    // 読み直したときは前後のエントリが番号を持ったままなので、今のエントリの番号から続ける
    at = Number((history.state as { i?: number } | null)?.i) || at;
    history.replaceState({ ...history.state, ...state, i: at }, "");
  } catch {
    /* 同上 */
  }
}

/** popstate で着いたエントリの向き。1 回の popstate につき 1 度だけ呼ぶ(シェルが呼ぶ) */
export function popDirection(state: unknown): "back" | "forward" {
  const i = Number((state as { i?: number } | null)?.i) || 0;
  const dir = i < at ? "back" : "forward";
  at = i;
  return dir;
}

/**
 * 戻る・進むで着いたエントリへの対応。go はその画面へ移る、back/forward は同じ向きにもう一歩、null は何もしない。
 * sub エントリ(画面の中の詳細など)は、持ち主が開いていなければ持ち主の画面が替わった後の残りなので飛ばす
 */
export function popAction(state: unknown, current: string | null, subsOpen: number, dir: "back" | "forward" = "back"): { go: string } | "back" | "forward" | null {
  const s = state as { mu?: string; label?: string } | null;
  if (s?.mu === "sub") return subsOpen ? null : dir;
  if (s?.mu === "screen" && s.label && s.label !== current) return { go: s.label };
  return null;
}
