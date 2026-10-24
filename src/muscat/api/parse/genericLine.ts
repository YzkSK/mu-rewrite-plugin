import type { GBlock, GControl, GInline } from "../types";
import { squash } from "./genericControls";

const isControl = (i: GInline): i is GControl => "ref" in i;
/** 自分で label を描く部品(この label と同じ文字が隣にあれば重複) */
const SELF_LABELED = new Set(["radio", "checkbox", "button"]);

/** 隣の部品の label と同じ文字を捨て、続く文字を 1 つにまとめる。空なら null */
export function lineOf(items: GInline[], tone?: "notice"): GBlock | null {
  const kept = items.filter((it, i) => {
    if (isControl(it)) return true;
    return ![items[i - 1], items[i + 1]].some((n) => n && isControl(n) && SELF_LABELED.has(n.kind) && "label" in n && n.label === it.text);
  });
  const merged: GInline[] = [];
  for (const it of kept) {
    const last = merged[merged.length - 1];
    if (!isControl(it) && last && !isControl(last)) merged[merged.length - 1] = { kind: "text", text: `${last.text} ${it.text}` };
    else merged.push(it);
  }
  return merged.length === 0 ? null : tone ? { kind: "line", items: merged, tone } : { kind: "line", items: merged };
}

/** 現在の行。text は空白をつぶし、空なら積まない */
export function makeLine() {
  let items: GInline[] = [];
  return {
    text(t: string | null | undefined) {
      const s = squash(t);
      if (s) items.push({ kind: "text", text: s });
    },
    controls(cs: GControl[]) {
      items.push(...cs);
    },
    /** 行を閉じて、空でなければ line ブロックを返す */
    close(): GBlock | null {
      const b = lineOf(items);
      items = [];
      return b;
    },
  };
}
