import { MuscatDownError, NoticeError, ParseError, RedirectError, SsoRequiredError, SupersededError } from "@/muscat/api/errors";

/** 開発用: localStorage["mu-dev"]="1" のときだけ、画面に出す前のエラーの中身をコンソールに出す(「読み取れませんでした」の原因を見る) */
function devError(e: unknown): void {
  try {
    if (localStorage.getItem("mu-dev") === "1") console.error("[mu-error]", e);
  } catch { /* 出せなくても画面には出す */ }
}

/** 画面に出すエラー文。どの画面でも共通 */
export function errorMessage(e: unknown): string {
  if (e instanceof SupersededError) return ""; // 別の画面へ移ったので、この画面の結果は使わない(想定内なのでログも出さない)
  devError(e);
  if (e instanceof NoticeError) return e.message;
  if (e instanceof RedirectError) return "MUSCAT のセッションが切れました。再読み込みしてください";
  if (e instanceof ParseError) return "読み取れませんでした";
  if (e instanceof SsoRequiredError) return "ログインが切れました。MUSCAT にログインし直してください";
  if (e instanceof MuscatDownError) return "MUSCAT が応答しません。しばらくして再読み込みしてください";
  if (e instanceof TypeError) return "MUSCAT と通信できませんでした。接続を確認してください"; // fetch の通信失敗
  return "読み取れませんでした";
}
