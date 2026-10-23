/** HTML の構造が想定と違い、読み取れなかった。 */
export class ParseError extends Error {}

/** 学内 SSO のログインが切れており、fetch では復帰できない。 */
export class SsoRequiredError extends Error {}

/** MUSCAT が応答しない(5xx、状態喪失が続く、復帰の間隔制限)。 */
export class MuscatDownError extends Error {}
