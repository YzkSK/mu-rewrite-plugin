const RE = /\[([A-Z][a-z]{2}\d{3})\]/;

/** 画面の見出しの `[Kmd008]` のようなコードを返す。見つからなければ ""。URL は遷移後も変わらないので使えない */
export function screenCodeOf(doc: Document): string {
  const top = doc.getElementById("mainWrapTop") ?? doc.getElementById("funcHeader");
  const m = top?.textContent?.match(RE);
  if (m?.[1]) return m[1];
  const body = doc.getElementById("mainWrapBottom") ?? doc.getElementById("wrap");
  return body?.textContent?.match(RE)?.[1] ?? "";
}
