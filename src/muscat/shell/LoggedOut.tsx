import { Button } from "@/ui/Button";

export type LoggedOutProps = {
  /** SSO から戻ってきた(入れなかった)場合 true。拡張でログアウトした場合は false */
  failed: boolean;
  /** ログインせずに見られるシラバスのリンク先。無ければ "" */
  syllabusHref: string;
  onEnter(): void;
};

/** パスワードのログイン画面の代わりに出す小さな画面 */
export function LoggedOut({ failed, syllabusHref, onEnter }: LoggedOutProps) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4 font-sans">
      <div className="flex w-full max-w-sm flex-col items-center gap-4 rounded-[4px] border border-gray-200 bg-white p-8 text-center">
        <h1 className="text-lg font-semibold text-gray-900">{failed ? "MUSCAT に入れませんでした" : "ログアウトしました"}</h1>
        <p className="text-sm text-gray-600">{failed ? "ログインをやり直してください。" : "続けるには、もう一度ログインしてください。"}</p>
        <Button onClick={onEnter}>MUSCAT に入る</Button>
        {syllabusHref && (
          <a href={syllabusHref} className="text-xs text-gray-500 underline">
            ログインせずにシラバスを見る
          </a>
        )}
      </div>
    </div>
  );
}
