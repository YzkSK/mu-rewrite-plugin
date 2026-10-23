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
const IGNORE = `${SKIP}, label, .ui-outputlabel, input[type="hidden"]`;

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
    else if (!el.querySelector(INNER)) text("message", textOf(el)); // 文字だけのブロック
    else visitChildren(el); // 入れ子の外枠の表などは、その中を読む
  }
  function visitChildren(el: Element) {
    for (const n of el.childNodes) {
      if (n.nodeType === 1) visit(n as Element);
      else if (n.nodeType === 3) text("message", squash(n.textContent));
    }
  }
  visitChildren(form);
  flush();
  return { blocks };
}
