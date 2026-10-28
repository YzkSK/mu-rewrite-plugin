export type ResponseKind = "page" | "partial";

/** 「別の画面で操作されたため…」の Error Page か。サーバーは操作を受け付けていないので、やり直しても二重にならない */
export const isRejected = (text: string): boolean => text.includes("<title>Error Page</title>");

/** サーバー側の状態を失った応答か(空・5xx・メニューなし・部分更新でない・部分更新で Error Page への差し替え)。 */
export function isStateLost(kind: ResponseKind, status: number, text: string): boolean {
  if (status >= 500 || text.length === 0) return true;
  if (kind === "page") return !text.includes('id="menuForm"');
  // 別のタブ・拡張の取得で画面がずれると、部分更新の形のまま ViewRoot を「別の画面で操作されたため…」の Error Page に差し替えてくる(実機で確認)。
  // メニューの無い ViewRoot でも先生の詳細などは正しい画面なので、Error Page の題で見分ける
  return !text.includes("<partial-response") || (text.includes('"jakarta.faces.ViewRoot"') && isRejected(text));
}
