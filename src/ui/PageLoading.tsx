import { createContext, useContext } from "react";
import { Spin } from "./Spin";

/** App が画面の題名を入れる。画面単体(テストなど)では空 */
export const PageTitleContext = createContext("");

/** 画面の初回読み込み中。「○○を読み込んでいます…」(題名が無ければ「読み込んでいます…」) */
export function PageLoading({ title }: { title?: string }) {
  const fromApp = useContext(PageTitleContext);
  const name = title ?? fromApp;
  return (
    <div role="status" className="grid place-content-center justify-items-center gap-3 py-16 text-muted-foreground">
      <Spin className="size-10 border-[3px]" />
      <b className="text-foreground">
        {`${name}を読み込んでいます`}<span className="mu-dots" aria-hidden="true"><i>.</i><i>.</i><i>.</i></span>
      </b>
    </div>
  );
}
