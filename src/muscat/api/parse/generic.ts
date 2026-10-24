import { assignRefs } from "../driver/locator";
import { ParseError } from "../errors";
import type { GBlock, GenericPage } from "../types";
import { controlsIn, SKIP, squash, textOf } from "./genericControls";
import { lineOf, makeLine } from "./genericLine";
import { dlBlock, gridBlock, tableBlock } from "./genericTables";
import { isSelectedPanel, tabsBlock } from "./genericTabs";

const HEADINGS: [string, 1 | 2 | 3 | 4][] = [
  [".ui-accordion-header", 2],
  [".ui-panel-title, .ui-fieldset-legend, .ui-panel-titlebar", 3],
  ["h1", 1],
  ["h2", 2],
  ["h3", 3],
  ["h4", 4],
];
const MESSAGE = ".ui-messages, .ui-message, .ui-growl-message";
const ACTION = 'input:not([type="hidden"]), select, textarea, button, a[onclick], a.ui-commandlink, div.ui-selectbooleanbutton';
/** 前後で行を閉じる要素(span / a / label などの inline は含めない) */
const BLOCK = new Set(["DIV", "P", "LI", "UL", "OL", "SECTION", "FORM", "FIELDSET", "TABLE", "TBODY", "THEAD", "TR", "TD", "TH", "DL", "DT", "DD", "H5", "H6", "HEADER", "FOOTER", "NAV", "ARTICLE", "PRE", "BLOCKQUOTE", "CENTER"]);

/** div でも、画面では文字や隣の部品と同じ行に並ぶ部品の枠 */
const WIDGET = ".ui-chkbox, .ui-radiobutton, .ui-selectonemenu, .ui-selectbooleanbutton, .ui-helper-hidden-accessible, .ui-inputfield, .ui-button";
/** table で組まれたラジオ・チェックの並び。表にせず、中の部品を 1 行に出す */
const CHOICES = ".ui-selectoneradio, .ui-selectmanycheckbox";

/**
 * #funcForm の中を文書順に読み、見出し・タブ・表・項目と、文字と操作部品が並ぶ行にする。
 * 副作用: 操作できる要素に data-mu-ref を付ける(driver が引く)。
 */
export function parseGenericPage(root: ParentNode): GenericPage {
  const form = root.querySelector("#funcForm");
  if (!form) throw new ParseError("funcForm がありません");
  assignRefs(form);
  let blocks: GBlock[] = [];
  const dialogs: Element[] = [];
  const line = makeLine();
  const emit = (b: GBlock | null) => {
    const l = line.close();
    if (l) blocks.push(l);
    if (b) blocks.push(b);
  };

  function visit(el: Element) {
    if (el.matches(SKIP) || (el.matches(".ui-button-text") && squash(el.textContent) === "ui-button")) return;
    if (el.matches(".ui-tabs-panel") && !isSelectedPanel(el)) return;
    if (el.matches(".ui-dialog")) return void dialogs.push(el); // 閉じたものは SKIP 済み。開いたものは最後にまとめて読む
    const heading = HEADINGS.find(([sel]) => el.matches(sel));
    if (el.matches(".ui-tabs-nav")) emit(tabsBlock(el));
    else if (heading) {
      const text = textOf(el);
      emit(text ? { kind: "heading", text, level: heading[1] } : null);
    } else if (el.matches(MESSAGE)) {
      const text = textOf(el);
      emit(text ? lineOf([{ kind: "text", text }], "notice") : null);
    } else if (el.matches(ACTION)) line.controls(controlsIn(el));
    else if (el.tagName === "BR" || el.tagName === "HR") emit(null);
    else {
      // dl / 表は、項目や行として読めたときだけ 1 つのブロックにする。読めなければ、捨てずに中身を読む
      const special = el.tagName === "DL" ? dlBlock(el) : el.tagName === "TABLE" && !el.querySelector("table") && !el.matches(CHOICES) ? (el.classList.contains("ui-panelgrid") ? gridBlock(el) : tableBlock(el)) : null;
      if (special) return emit(special);
      const block = BLOCK.has(el.tagName) && !el.matches(WIDGET) && !el.closest(CHOICES);
      if (block) emit(null);
      visitChildren(el);
      if (block) emit(null);
    }
  }
  function visitChildren(el: Element) {
    for (const n of el.childNodes) {
      if (n.nodeType === 3) line.text(n.textContent);
      else if (n.nodeType === 1) visit(n as Element);
    }
  }
  visitChildren(form);
  emit(null);
  // body の直下に移されたダイアログ(例:「エラーがあります。」)も拾う。上の段・メニューのものは画面の中身ではない
  for (const d of root.querySelectorAll('.ui-dialog:not([aria-hidden="true"])')) {
    if (form.contains(d) || d.closest("#headerForm, #menuForm")) continue;
    assignRefs(d);
    dialogs.push(d);
  }
  const main = blocks;
  const open: GBlock[] = [];
  for (const d of dialogs) {
    blocks = [];
    visitChildren(d);
    emit(null);
    const t = d.querySelector(".ui-dialog-title");
    open.push({ kind: "dialog", title: t ? textOf(t) : "", blocks });
  }
  return { blocks: [...main, ...open] };
}
