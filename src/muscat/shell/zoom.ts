const KEY = "mu-zoom";
/** 選べる拡大率(%)と呼び名。個人設定の「表示の大きさ」。今までの大きさが「小」 */
export const ZOOMS = [
  { value: 100, label: "小" },
  { value: 112, label: "中" },
  { value: 125, label: "大" },
] as const;

const listeners = new Set<() => void>();
const valid = (n: number) => (ZOOMS.some((z) => z.value === n) ? n : 100);
// 覚えられない環境(localStorage が使えない)でも、この画面では選んだ大きさにする
let current: number | null = null;

/** 拡張の画面全体の拡大率(%)。このブラウザに覚える(次にログインしても続く) */
export function getZoom(): number {
  if (current !== null) return current;
  try {
    return valid(Number(localStorage.getItem(KEY)));
  } catch {
    return 100;
  }
}

export function setZoom(n: number): void {
  current = valid(n);
  try {
    localStorage.setItem(KEY, String(current));
  } catch {
    // 覚えられなくても、この画面では変える
  }
  for (const f of listeners) f();
}

/** 拡大率が変わったら呼ばれる(すぐ描き直す)。外す関数を返す */
export function onZoomChange(f: () => void): () => void {
  listeners.add(f);
  return () => void listeners.delete(f);
}
