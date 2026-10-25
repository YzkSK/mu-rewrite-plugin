/** HTML の構造が想定と違い、読み取れなかった。 */
export class ParseError extends Error {}

/** 学内 SSO のログインが切れており、fetch では復帰できない。 */
export class SsoRequiredError extends Error {}

/** MUSCAT が応答しない(5xx、状態喪失が続く、復帰の間隔制限)。 */
export class MuscatDownError extends Error {}

/** 元のページが出した警告など、文をそのまま見せる失敗。 */
export class NoticeError extends Error {}

/** 部分更新の応答が <redirect>(セッション切れや画面の移動)だった。画面は再読み込みを案内する。 */
export class RedirectError extends Error {
  constructor(readonly url: string) {
    super("redirect");
  }
}

/** もっと新しい画面の移動が来たので、待っていた操作を捨てた。 */
export class SupersededError extends Error {}
