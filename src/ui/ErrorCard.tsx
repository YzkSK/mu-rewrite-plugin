import type { ReactNode } from "react";
import { Card } from "./Card";
import { NativeLink } from "./NativeLink";

/** 画面の読み込み失敗の文を出す枠(元の画面へ出る小さなボタン付き) */
export const ErrorCard = ({ children }: { children: ReactNode }) => (
  <Card className="flex flex-col gap-2 p-4 text-error">
    <span>{children}</span>
    <NativeLink />
  </Card>
);
