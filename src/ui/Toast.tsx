import { useCallback, useEffect, useState, type ReactNode } from "react";

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
