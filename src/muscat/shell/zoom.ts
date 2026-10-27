const KEY = "mu-zoom";
/** 選べる拡大率(%)。拡張の設定(options.html)で選び、chrome.storage.sync に覚える。値は options.js と揃える */
export const ZOOMS = [90, 100, 112, 125] as const;

const listeners = new Set<() => void>();
const valid = (n: unknown) => (ZOOMS.includes(n as never) ? (n as number) : 100);
let current = 100;

const set = (v: unknown) => {
  current = valid(v);
  for (const f of listeners) f();
};

// テストなど拡張の外では chrome が無いので、いつも 100%
const storage = (globalThis as { chrome?: { storage?: any } }).chrome?.storage;
if (storage?.sync) {
  storage.sync.get(KEY).then((r: Record<string, unknown>) => set(r[KEY]), () => {});
  storage.onChanged.addListener((c: Record<string, { newValue?: unknown }>, area: string) => {
    if (area === "sync" && c[KEY]) set(c[KEY].newValue);
  });
}

/** 拡張の画面全体(MUSCAT・ポータル・LMS)の拡大率(%) */
export function getZoom(): number {
  return current;
}

/** 拡大率が変わったら呼ばれる(すぐ描き直す)。外す関数を返す */
export function onZoomChange(f: () => void): () => void {
  listeners.add(f);
  return () => void listeners.delete(f);
}
