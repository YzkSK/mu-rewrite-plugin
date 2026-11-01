import { openOriginal } from "./route";

const BTN = "h-9 cursor-pointer rounded-[4px] border border-border bg-card px-4 text-[13.5px] hover:bg-muted max-[767px]:h-11";

/** 最初の画面を読めなかったとき。元のアプリは止めてあるので、ここから再読み込みか元の画面へ */
export function LmsError() {
  return (
    <div className="grid h-full place-items-center bg-background p-4 text-foreground">
      <div role="alert" className="flex w-full max-w-sm flex-col gap-4 rounded-[4px] border border-border bg-card p-5 text-card-foreground shadow-md">
        <p className="m-0 text-[15px] font-bold">MU LMS を読み込めませんでした</p>
        <div className="flex flex-wrap justify-end gap-2 max-[767px]:grid max-[767px]:grid-cols-2">
          <button type="button" className={BTN} onClick={() => location.reload()}>もう一度読み込む</button>
          <button type="button" className={BTN} onClick={openOriginal}>元の LMS で開く</button>
        </div>
      </div>
    </div>
  );
}
