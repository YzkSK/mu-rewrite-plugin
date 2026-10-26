import { Fn, Reader } from "./js";
import { actionOf, appendFields, PARTIAL_HEADERS, type Req } from "./req";

/** PrimeFaces.ab({...}) の設定のうち、通信に要るもの(onst / oner / onsu は読み捨て。onco は小窓の開閉だけ使うので本文を持つ) */
export type AbConfig = {
  s?: string;
  f?: string;
  u?: string;
  p?: string;
  /** 部分送信の追加の処理先(PrimeFaces は p に空白で足す。表の行のリンクなど) */
  fp?: string;
  e?: string;
  pa?: { name: string; value: string }[];
  rv?: boolean;
  onco?: string;
};

/** onclick / data-pfconfirmcommand / behaviors の関数の文字列にある、最後の PrimeFaces.ab({...}) の設定。無ければ null */
export function parseAb(js: string): AbConfig | null {
  const at = js.lastIndexOf("PrimeFaces.ab(");
  if (at < 0) return null;
  const open = js.indexOf("{", at);
  if (open < 0) return null;
  try {
    const o = new Reader(js, open).object();
    const str = (k: string) => (typeof o[k] === "string" ? (o[k] as string) : undefined);
    const pa = Array.isArray(o.pa)
      ? (o.pa as Record<string, unknown>[]).filter((x) => x && typeof x.name === "string").map((x) => ({ name: String(x.name), value: String(x.value ?? "") }))
      : undefined;
    return { s: str("s"), f: str("f"), u: str("u"), p: str("p"), fp: str("fp"), e: str("e"), pa, rv: o.rv === true, onco: o.onco instanceof Fn ? o.onco.raw : undefined };
  } catch {
    return null;
  }
}

/** 検索式(空白区切り)を ids にする。@this → source、@form → フォームの id、@(css) → 一致する要素の id、@all / @none / ふつうの id はそのまま */
export function resolveExpr(doc: Document, expr: string, source: string, formId: string): string {
  const out = (expr.match(/@\([^)]*\)|\S+/g) ?? []).flatMap((t) => {
    if (t === "@this") return [source];
    if (t === "@form") return [formId];
    if (t.startsWith("@(")) {
      try {
        return [...doc.querySelectorAll(t.slice(2, -1))].map((e) => e.id).filter(Boolean);
      } catch {
        return [];
      }
    }
    return [t];
  });
  return [...new Set(out)].join(" ");
}

/** ab に足す、部品ごとの追加(extra の params は pa のあと)。ignoreAutoUpdate は動的なタブの読み込み用 */
export type AbExt = { params?: [string, string][]; ignoreAutoUpdate?: boolean; /** `<s>=<s>` を params の前に置く(動的なタブの読み込み。実機で記録) */ sourceFirst?: boolean; table?: { id: string; first: number; rows: number } };

/**
 * PrimeFaces.ab と同じ部分更新の要求を組み立てる(実機で記録した本文の順):
 * partial.ajax, source, resetvalues, ignoreautoupdate, execute(既定 @all), render(u がある時だけ), behavior.event / partial.event(e がある時だけ),
 * pa, 部品の params, `<s>=<s>`(e が無い時だけ), フォームの全項目。フォームは f、無ければ送信元を含むフォーム
 */
export function buildAbRequest(doc: Document, cfg: AbConfig, src?: Element | null, ext: AbExt = {}): Req {
  const source = cfg.s ?? src?.id;
  if (!source) throw new Error("送信元がありません");
  // f が無ければ送信元を含むフォーム、それも無ければ文書の先頭のフォーム(PrimeFaces と同じ)。
  // 小窓は body 直下にあり、掲示板の詳細の close は headerForm を送る(2026-10-26 実機で記録)
  const at = src ?? doc.getElementById(source);
  const form = (cfg.f ? doc.getElementById(cfg.f) : null) ?? at?.closest("form") ?? (at ? doc.querySelector("form") : null);
  if (form?.tagName !== "FORM") throw new Error("フォームが見つかりません");
  const body = new URLSearchParams();
  body.append("jakarta.faces.partial.ajax", "true");
  body.append("jakarta.faces.source", source);
  if (cfg.rv) body.append("primefaces.resetvalues", "true");
  if (ext.ignoreAutoUpdate) body.append("primefaces.ignoreautoupdate", "true");
  // 処理先は p のあとに fp を足す(重複は除く)。どちらも無ければ @all
  const execute = resolveExpr(doc, [cfg.p, cfg.fp].filter(Boolean).join(" "), source, form.id);
  body.append("jakarta.faces.partial.execute", execute || "@all");
  const render = cfg.u ? resolveExpr(doc, cfg.u, source, form.id) : "";
  if (render && render !== "@none") body.append("jakarta.faces.partial.render", render);
  if (cfg.e) {
    body.append("jakarta.faces.behavior.event", cfg.e);
    body.append("jakarta.faces.partial.event", cfg.e);
  }
  if (!cfg.e && ext.sourceFirst) body.append(source, source);
  for (const x of cfg.pa ?? []) body.append(x.name, x.value);
  for (const [k, v] of ext.params ?? []) body.append(k, v);
  if (!cfg.e && !ext.sourceFirst) body.append(source, source);
  appendFields(body, form as HTMLFormElement);
  return { url: actionOf(form), body, headers: PARTIAL_HEADERS };
}
