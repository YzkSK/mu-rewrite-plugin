import { parseAb, type AbConfig } from "./ab";
import { Fn, Reader } from "./js";

/** 部品の初期化 PrimeFaces.cw("Type","widgetVar",{id, ..., behaviors:{click:function(ext,event){PrimeFaces.ab({...},ext);}}}) を読んだもの */
export type Widget = { type: string; widgetVar: string; id: string; cfg: Record<string, unknown>; behaviors: Record<string, string> };

const CW = /PrimeFaces\.cw\(\s*(["'])([^"']*)\1\s*,\s*(["'])([^"']*)\3\s*,\s*(?=\{)/g;

/** 文書ごとの控え。部品の表と、id を持つ script の文字(remoteCommand など。教室予約が id を引く) */
type Registry = { widgets: Map<string, Widget>; scripts: Map<string, string> };
const registries = new WeakMap<Document, Registry>();
const registryOf = (doc: Document): Registry => {
  let r = registries.get(doc);
  if (!r) registries.set(doc, (r = { widgets: new Map(), scripts: new Map() }));
  return r;
};

/**
 * 文書の script を読んで控えに入れ、文書から取り除く(元の PrimeFaces も初期化のあと script を消す。残すと textContent に
 * `PrimeFaces.cw(...)` の文字が混ざって、画面の文字が崩れた。実機で確認)。種類は問わない。動かさず、文字だけ読む。
 * ページを取り込んだとき・部分更新を当てたときに呼ぶ(scanWidgets からも呼ぶので、取りこぼしても次に読むとき片付く)
 */
export function absorbScripts(doc: Document): void {
  const scripts = doc.querySelectorAll("script");
  if (!scripts.length) return;
  const reg = registryOf(doc);
  for (const s of [...scripts]) {
    const text = s.textContent ?? "";
    if (s.id) reg.scripts.set(s.id, text);
    if (text.includes("PrimeFaces.cw(")) {
      for (const m of text.matchAll(CW)) {
        try {
          const cfg = new Reader(text, m.index + m[0].length).object();
          if (typeof cfg.id !== "string") continue;
          const behaviors: Record<string, string> = {};
          const b = cfg.behaviors;
          if (b && typeof b === "object") for (const [k, v] of Object.entries(b)) if (v instanceof Fn) behaviors[k] = v.raw;
          reg.widgets.set(cfg.id, { type: m[2]!, widgetVar: m[4]!, id: cfg.id, cfg, behaviors });
        } catch {
          /* 読めない部品は飛ばす */
        }
      }
    }
    s.remove();
  }
}

/** 部品の表(id → 部品)。置き換わって無くなった要素の分も残るが、引くのは今ある要素の id だけ */
export function scanWidgets(doc: Document): Map<string, Widget> {
  absorbScripts(doc);
  return registryOf(doc).widgets;
}

/** 取り除いた script のうち、id を持ち、文字に text を含むものの id(最初の 1 つ)。無ければ undefined */
export function scriptIdWith(doc: Document, text: string): string | undefined {
  absorbScripts(doc);
  for (const [id, t] of registryOf(doc).scripts) if (t.includes(text)) return id;
  return undefined;
}

/** 部品 id の behavior(click / change / tabChange ...)の ab。無ければ null */
export function behaviorOf(widgets: Map<string, Widget>, id: string | undefined, ...events: string[]): AbConfig | null {
  const w = id ? widgets.get(id) : undefined;
  for (const e of events) {
    const raw = w?.behaviors[e];
    const cfg = raw ? parseAb(raw) : null;
    if (cfg) return cfg;
  }
  return null;
}
