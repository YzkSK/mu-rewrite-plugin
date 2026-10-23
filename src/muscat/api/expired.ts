export type ResponseKind = "page" | "partial";

/** サーバー側の状態を失った応答か(空・5xx・メニューなし・部分更新でない)。 */
export function isStateLost(kind: ResponseKind, status: number, text: string): boolean {
  if (status >= 500 || text.length === 0) return true;
  return kind === "page" ? !text.includes('id="menuForm"') : !text.includes("<partial-response");
}
