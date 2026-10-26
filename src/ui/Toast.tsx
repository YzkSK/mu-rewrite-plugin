import { useCallback, useEffect, useState, useSyncExternalStore, type ReactNode } from "react";

// 操作の失敗はどの画面からでも出せるよう、ひとつの入れ物に持つ(画面を移っても消えない)
let errorShown: { id: number; title: string; message: string } | null = null;
const listeners = new Set<() => void>();
const setError = (v: typeof errorShown) => { errorShown = v; listeners.forEach((l) => l()); };
const subscribe = (l: () => void) => { listeners.add(l); return () => listeners.delete(l); };

/** 失敗を右下に出す。読む時間が要るので 8 秒、✕でも閉じられる */
export function errorToast(title: string, message = ""): void {
  setError({ id: (errorShown?.id ?? 0) + 1, title, message });
}

export function ErrorToast() {
  const shown = useSyncExternalStore(subscribe, () => errorShown);
  useEffect(() => {
    if (!shown) return;
    const t = setTimeout(() => setError(null), 8000);
    return () => clearTimeout(t);
  }, [shown]);
  if (!shown) return null;
  return (
    <div role="alert" className="fixed right-6 bottom-6 z-50 flex max-w-[420px] items-start gap-3 rounded-[4px] border border-[#e7b9b5] bg-[#fbefee] px-4 py-3 shadow-sm">
      <div className="flex min-w-0 flex-col gap-1">
        <p className="m-0 text-sm font-semibold text-[#8c1d17]">{shown.title}</p>
        {shown.message && <p className="m-0 text-[13px] text-foreground">{shown.message}</p>}
      </div>
      <button type="button" aria-label="閉じる" onClick={() => setError(null)} className="shrink-0 cursor-pointer border-0 bg-transparent p-0 text-[#8c1d17]">✕</button>
    </div>
  );
}

const SHOW_MS = 3000;

/** 画面の下中央に 3 秒だけ出る一言。node を画面のどこかに置き、toast(文) で出す */
export function useToast(): { toast: (message: string) => void; node: ReactNode } {
  // 同じ文を続けて出しても出し直せるよう、id も持つ
  const [shown, setShown] = useState<{ id: number; message: string } | null>(null);
  const toast = useCallback((message: string) => setShown((s) => ({ id: (s?.id ?? 0) + 1, message })), []);
  useEffect(() => {
    if (!shown) return;
    const t = setTimeout(() => setShown(null), SHOW_MS);
    return () => clearTimeout(t);
  }, [shown]);
  const node = shown ? (
    <div role="status" className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-[4px] bg-[#1f1a24] px-4 py-2 text-[13px] text-white">
      {shown.message}
    </div>
  ) : null;
  return { toast, node };
}
