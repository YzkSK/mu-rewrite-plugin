import { clearLoggedOut, clearTried, LOGIN_URL } from "./login";
import { openOriginal } from "./route";

const BTN = "h-9 cursor-pointer rounded-[4px] border border-border bg-card px-4 text-[13.5px] hover:bg-muted max-[767px]:h-11";

export type GateKind = "loggedout" | "failed";

/** ログアウト直後の案内と、ログインから戻っても未ログインだったときの案内。元のアプリは止めてあるので、ここから次へ */
export function LmsGate({ kind }: { kind: GateKind }) {
  const out = kind === "loggedout";
  const again = () => {
    if (out) clearLoggedOut(); else clearTried();
    location.assign(LOGIN_URL);
  };
  return (
    <div className="grid h-full place-items-center bg-background p-4 text-foreground">
      <div role={out ? "status" : "alert"} className="flex w-full max-w-sm flex-col gap-4 rounded-[4px] border border-border bg-card p-5 text-card-foreground shadow-md">
        <p className="m-0 text-[15px] font-bold">{out ? "ログアウトしました" : "ログインできませんでした"}</p>
        <div className="flex flex-wrap justify-end gap-2 max-[767px]:grid max-[767px]:auto-cols-fr max-[767px]:grid-flow-col">
          <button type="button" className={BTN} onClick={again}>{out ? "もう一度ログイン" : "もう一度試す"}</button>
          {out ? null : <button type="button" className={BTN} onClick={openOriginal}>元の LMS で開く</button>}
        </div>
      </div>
    </div>
  );
}
