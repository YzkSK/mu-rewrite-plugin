import { ParseError } from "./errors";
import type { Core } from "./core";
import type { MenuLabel } from "./session";
import { actionOf, appendFields } from "./virtual/req";

export type ExportKind = "PDF" | "Excel";
export type ExportRequest = { url: string; fields: [string, string][] };

/** 今の画面の元の「PDF」「Excel」ボタン。同じ form の「非表示」ボタン(id が pdfButton / excelButton)とは別物なので、文字で探す */
export const findExportButton = (doc: Document, text: ExportKind) =>
  [...doc.querySelectorAll<HTMLButtonElement>("#funcForm button")].find((b) => b.textContent?.trim() === text);

/** そのボタンを押したときに元の画面が送る POST(ajax ではない)の送り先と項目: ボタンの id=値 + フォームの全項目(ViewState 含む) */
export function exportRequestOf(doc: Document, text: ExportKind): ExportRequest | null {
  const btn = findExportButton(doc, text);
  const form = btn?.closest("form");
  if (!btn || !form) return null;
  const body = new URLSearchParams();
  appendFields(body, form);
  body.append(btn.name || btn.id, btn.value);
  return { url: actionOf(form), fields: [...body] };
}

/** ボタンのある画面(label のメニュー)を開いて、出力の POST を組み立てる */
export function getExportRequest(core: Core, label: MenuLabel, text: ExportKind): Promise<ExportRequest> {
  return core.aside(async (ctx) => {
    if (!(await ctx.open(label, (d) => !!findExportButton(d, text)))) return null;
    const req = exportRequestOf(ctx.doc(), text);
    if (!req) throw new ParseError(`${text} のボタンがありません`);
    return req;
  });
}
