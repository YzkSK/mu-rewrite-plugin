import { actionOf, PARTIAL_HEADERS } from "./virtual/req";
import { absorbScripts } from "./virtual/widgets";

export function buildPartialRequest(
  form: HTMLFormElement,
  source: string,
  extra: Record<string, string | null> = {}, // null のキーは本文から除く(外したチェックボックス)
  render: string = form.id,
  execute = "@all",
): { url: string; body: URLSearchParams; headers: Record<string, string> } {
  const body = new URLSearchParams();
  for (const [k, v] of new FormData(form)) if (typeof v === "string") body.set(k, v);
  body.set("jakarta.faces.partial.ajax", "true");
  body.set("jakarta.faces.source", source);
  body.set("jakarta.faces.partial.execute", execute);
  body.set("jakarta.faces.partial.render", render);
  body.set(source, source);
  for (const [k, v] of Object.entries(extra)) {
    if (v === null) body.delete(k);
    else body.set(k, v);
  }
  return {
    url: actionOf(form),
    body,
    headers: PARTIAL_HEADERS,
  };
}

function setAll(doc: Document, name: string, value: string) {
  for (const el of doc.querySelectorAll<HTMLInputElement>(`input[name="${name}"]`)) el.value = value;
}

/**
 * PrimeFaces と同じ: 値を trim し、method=post のすべてのフォームに ViewState を入れる。
 * フォームの差し替えで ViewState の項目が消えているので、無いフォームには追加する(追加しないと次の送信に ViewState が付かず、
 * サーバーは 2 回目以降の変更を受け付けない。実機で確認)。
 */
function setViewState(doc: Document, value: string) {
  const v = value.trim();
  for (const form of doc.querySelectorAll("form")) {
    if ((form.getAttribute("method") ?? "").toLowerCase() !== "post") continue;
    const el = [...form.children].find(
      (c): c is HTMLInputElement => c instanceof HTMLInputElement && c.name === "jakarta.faces.ViewState",
    );
    if (el) el.value = v;
    else {
      const input = doc.createElement("input");
      input.type = "hidden";
      input.name = "jakarta.faces.ViewState";
      input.value = v;
      input.setAttribute("autocomplete", "off");
      form.appendChild(input);
    }
  }
}

/** 部分更新の XML を doc に反映する。rx-token は menuForm を含む全フォームに揃える。skip の id の update は適用しない。 */
export function applyPartialResponse(doc: Document, xml: string, skip: string[] = []): void {
  // DOMParser の XML は CDATA の扱いが環境で違うため、<update> を直接読む
  for (const m of xml.matchAll(/<update\s+id="([^"]*)"[^>]*>([\s\S]*?)<\/update>/g)) {
    const id = m[1] ?? "";
    if (skip.includes(id)) continue;
    const content = (m[2] ?? "").replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1");
    if (id.includes("ViewState")) {
      setViewState(doc, content);
      continue;
    }
    const target = doc.getElementById(id);
    if (!target) continue;
    target.outerHTML = content;
    const token = new DOMParser()
      .parseFromString(content, "text/html")
      .querySelector<HTMLInputElement>('input[name="rx-token"]')?.value;
    if (token !== undefined) setAll(doc, "rx-token", token);
  }
  absorbScripts(doc); // 差し替えた中の script は控えに入れて取り除く(元の画面の script は動かさない)
}
