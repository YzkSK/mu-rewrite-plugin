import { assignRefs } from "../driver/locator";
import { ParseError } from "../errors";
import type { GBlock, GControl, GenericPage } from "../types";
import { controlsIn, SKIP, squash, textOf } from "./genericControls";
import { dlBlock, gridBlock, tableBlock } from "./genericTables";

const HEADING = ".ui-accordion-header, h1, h2, h3, h4, .ui-panel-title, .ui-fieldset-legend";
const MESSAGE = ".ui-messages, .ui-message, .ui-growl-message";
const TAB = ".ui-tabs-nav li";
const ACTION = 'input:not([type="hidden"]), select, textarea, button, a[onclick]';
const INNER = `table, dl, ${ACTION}, ${HEADING}, ${MESSAGE}, ${TAB}`;
const INLINE = new Set(["SPAN", "A", "I", "B", "EM", "STRONG", "SMALL", "U", "FONT", "CODE", "SUB", "SUP"]);
const BLOCKISH = "div, p, ul, ol, li, table, dl, section, br, h1, h2, h3, h4, h5, h6";
/** 文字だけのインライン要素(操作部品・見出し・メッセージ・ブロックを含まない) */
const isInline = (el: Element) => INLINE.has(el.tagName) && !el.matches(INNER) && !el.querySelector(`${INNER}, ${BLOCKISH}`);
const IGNORE =`${SKIP}, label, .ui-outputlabel, input[type="hidden"]`;

/**
 * #funcForm の中を文書順に読み、見出し・表・項目・メッセージ・操作部品の並びにする。
 * 副作用: 操作できる要素に data-mu-ref を付ける(driver が引く)。
 */
export function parseGenericPage(root: ParentNode): GenericPage {
  const form = root.querySelector("#funcForm");
  if (!form) throw new ParseError("funcForm がありません");
  assignRefs(form);
  const blocks: GBlock[] = [];
  let pending: GControl[] = [];
  const flush = () => {
    if (pending.length > 0) blocks.push({ kind: "controls", controls: pending });
    pending = [];
  };
  const push = (b: GBlock | null) => {
    if (!b) return;
    flush();
    blocks.push(b);
  };
  const text = (kind: "heading" | "message", t: string) => t && push({ kind, text: t });

  function visit(el: Element) {
    if (el.matches(IGNORE)) return;
    if (el.matches(TAB)) {
      const buttons = controlsIn(el);
      if (buttons.length > 0) pending.push(...buttons);
      else text("heading", textOf(el));
    } else if (el.matches(HEADING)) text("heading", textOf(el));
    else if (el.matches(MESSAGE)) text("message", textOf(el));
    else if (el.matches(ACTION)) pending.push(...controlsIn(el));
    else if (el.tagName === "DL") push(dlBlock(el));
    else if (el.tagName === "TABLE" && !el.querySelector("table")) push(el.classList.contains("ui-panelgrid") ? gridBlock(el) : tableBlock(el));
    else visitChildren(el); // 文字だけのブロックも、入れ子の外枠の表も、中を読む
  }
  /** 同じ親の中で連続するインラインの断片(テキストノードと span/a など)は、空白でつないで 1 つの message にする */
  function visitChildren(el: Element) {
    let run: string[] = [];
    const end = () => {
      text("message", run.filter(Boolean).join(" "));
      run = [];
    };
    for (const n of el.childNodes) {
      if (n.nodeType === 3) run.push(squash(n.textContent));
      else if (n.nodeType === 1) {
        const c = n as Element;
        if (c.matches(IGNORE)) continue;
        if (isInline(c)) run.push(textOf(c));
        else {
          end();
          visit(c);
        }
      }
    }
    end();
  }
  visitChildren(form);
  flush();
  return { blocks };
}
