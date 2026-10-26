import { MuscatDownError, NoticeError, RedirectError } from "../errors";
import { applyPartialResponse } from "../partial";
import { dialogMessages } from "../roomFetch";
import { fillRows, updatePaginator, type TablePage } from "./table";
import { scanWidgets } from "./widgets";

const CDATA = /<!\[CDATA\[([\s\S]*?)\]\]>/g;
const CALL = /PF\(\s*['"]([^'"]+)['"]\s*\)\.(show|hide)\(/g;

/** 小窓の開閉を文書に記録する。パーサーは aria-hidden="false" を「開いている」と読む(元の画面と同じ)。data-mu-open も付ける */
export function setOpen(el: Element, open: boolean): void {
  el.setAttribute("aria-hidden", String(!open));
  if (open) el.setAttribute("data-mu-open", "");
  else el.removeAttribute("data-mu-open");
}

/** JS の文字列にある PF('widgetVar').show() / hide() を、順に文書へ反映する(ほかの script は動かさない) */
export function applyDialogCalls(doc: Document, js: string): void {
  if (!js.includes("PF(")) return;
  const byVar = new Map([...scanWidgets(doc).values()].map((w) => [w.widgetVar, w.id]));
  for (const m of js.matchAll(CALL)) {
    const id = byVar.get(m[1]!);
    const el = id ? doc.getElementById(id) : null;
    if (el) setOpen(el, m[2] === "show");
  }
}

/**
 * 部分更新の応答を文書に取り込む(元の画面の script は動かさない代わりに、必要なことだけ自分でする):
 * - `<update>` は要素を差し替え、ViewState は全 POST フォームへ、rx-token は全フォームへ(applyPartialResponse)
 * - table があれば(DataTable のページ送り)、その update は行だけなので表の本体に入れ、ページャーを直す(table.ts)
 * - `<eval>` と ab の onco にある PF('x').show() / hide() は、小窓の開閉として記録。差し替えた中の visible:true の小窓は開く
 * - `jakarta.faces.ViewRoot` の update は画面ごとの置き換え(例: 表の教員名のリンク → 教員の予定の画面)。中身(CDATA は分かれて来るので全部つなぐ)を
 *   新しい Document にし、ほかの update(ViewState など)はそれに当てる。置き換えたら onReplace に渡す(呼んだ側が新しい画面として取り込む)
 * - 警告・エラーの小窓の文は NoticeError、`<redirect>` は RedirectError、`<error>` は MuscatDownError(取り込めるものは取り込んでから投げる)
 */
export function applyResponse(source: Document, xml: string, onco = "", table?: TablePage, onReplace?: (next: Document) => void): void {
  const redirect = /<partial-response[^>]*>\s*<redirect\s+url="([^"]*)"/.exec(xml);
  if (redirect) throw new RedirectError(redirect[1] ?? "");
  if (/<partial-response[^>]*>\s*<error>/.test(xml)) throw new MuscatDownError("MUSCAT がエラーを返しました");
  const root = /<update\s+id="[^"]*ViewRoot[^"]*"[^>]*>([\s\S]*?)<\/update>/.exec(xml);
  const doc = root ? new DOMParser().parseFromString((root[1] ?? "").replace(CDATA, "$1"), "text/html") : source;
  const updated = [...xml.matchAll(/<update\s+id="([^"]*)"/g)].map((m) => m[1]!);
  const before = new Set(scanWidgets(doc).values());
  // DataTable のページ送りの応答は行だけ。表の本体に入れ、表は差し替えない
  const rows = table && !root ? fillRows(doc, table.id, xml) : false;
  applyPartialResponse(doc, xml, rows && table ? [table.id] : []);
  if (rows && table) updatePaginator(doc, table);
  for (const w of scanWidgets(doc).values()) {
    if (before.has(w) || w.cfg.visible !== true) continue; // 今回の応答で初期化された部品だけ
    const el = doc.getElementById(w.id);
    if (el && updated.some((u) => doc.getElementById(u)?.contains(el))) setOpen(el, true);
  }
  const evals = [...xml.matchAll(/<eval>([\s\S]*?)<\/eval>/g)].map((m) => (m[1] ?? "").replace(CDATA, "$1")).join("\n");
  applyDialogCalls(doc, `${evals}\n${onco}`);
  if (root) onReplace?.(doc);
  const notice = dialogMessages(xml);
  if (notice) throw new NoticeError(notice);
}
