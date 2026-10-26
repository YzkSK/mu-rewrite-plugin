/** 成績照会の表を読むための小さな共通部品 */

/** 空白を除き、全角の丸括弧を半角にそろえる */
export const squash = (s: string | null | undefined) => (s ?? "").replace(/\s+/g, "").replace(/（/g, "(").replace(/）/g, ")");

export const tds = (tr: Element) => [...tr.querySelectorAll(":scope > td")];

/** 表の最初の行のセル(th でも td でも)のテキスト */
export const headerOf = (table: Element) =>
  [...(table.querySelector("tr")?.querySelectorAll(":scope > th, :scope > td") ?? [])].map((c) => squash(c.textContent));

export const num = (s: string | null | undefined) => {
  const n = parseFloat(squash(s));
  return Number.isFinite(n) ? n : null;
};

/** `kamokuLevelN`(N は奇数)→ 深さ (N-1)/2。無ければ 0 */
export function depthOf(cell: Element | undefined): number {
  const n = Number(/kamokuLevel(\d+)/.exec(cell?.className ?? "")?.[1]);
  return Number.isFinite(n) && n > 0 ? (n - 1) / 2 : 0;
}
