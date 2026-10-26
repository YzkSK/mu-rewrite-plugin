import { createContext, useContext } from "react";

/** 「元の画面で開く」の操作。MUSCAT のシェルだけが入れる(無ければリンクは出ない) */
export const NativeContext = createContext<(() => void) | null>(null);

/** エラーの表示に添える、元の画面へ出る小さな文字のボタン */
export function NativeLink() {
  const open = useContext(NativeContext);
  if (!open) return null;
  return (
    <button type="button" onClick={open} className="w-fit cursor-pointer border-0 bg-transparent p-0 text-xs text-muted-foreground underline">
      元の画面で開く
    </button>
  );
}
