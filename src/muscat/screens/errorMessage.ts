import { MuscatDownError, ParseError, SsoRequiredError } from "@/muscat/api/errors";

/** 画面に出すエラー文。どの画面でも共通 */
export function errorMessage(e: unknown): string {
  if (e instanceof ParseError) return "読み取れませんでした";
  if (e instanceof SsoRequiredError) return "ログインが切れました。MUSCAT にログインし直してください";
  if (e instanceof MuscatDownError) return "MUSCAT が応答しません。しばらくして再読み込みしてください";
  return "読み取れませんでした";
}
