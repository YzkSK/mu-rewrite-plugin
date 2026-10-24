/** 生きたページの元の「PDF」「Excel」ボタン。同じ form の「非表示」ボタン(id が pdfButton / excelButton)とは別物なので、文字で探す */
export const findExportButton = (doc: Document, text: "PDF" | "Excel") =>
  [...doc.querySelectorAll<HTMLButtonElement>("#funcForm button")].find((b) => b.textContent?.trim() === text);

/** 押したら true。見つからなければ false */
export function exportFile(doc: Document, text: "PDF" | "Excel"): boolean {
  const b = findExportButton(doc, text);
  b?.click();
  return !!b;
}
