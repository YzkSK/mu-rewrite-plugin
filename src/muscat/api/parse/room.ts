import { assignRef } from "../driver/locator";
import { ParseError } from "../errors";
import type { CheckOption, RoomPage, RoomRange } from "../types";
import { squash } from "./genericControls";
import { buttonByText, checkOptions, refOf, selectField, textField } from "./liveFields";
import { parseRoomResult } from "./roomTimeline";

/** 「クリア」は検索語の欄のものと 2 つある。主のクリアは検索の並びにある最後の方 */
const lastButton = (form: Element, text: string) => [...form.querySelectorAll("button")].filter((b) => squash(b.textContent) === text).pop() ?? null;

/** チェックボックス群の表(PrimeFaces の selectmanycheckbox)。name は中の input から取る(生成 id なので固定しない) */
const group = (table: Element | undefined) => {
  const name = table?.querySelector("input")?.getAttribute("name");
  return table && name ? checkOptions(table, name) : [];
};

/** 表示のラジオ(PrimeFaces の selectoneradio)。操作は見えている枠 */
export const radios = (form: Element): CheckOption[] =>
  [...form.querySelectorAll<HTMLInputElement>('input[type="radio"]')].map((input) => {
    // ボタンを並べて 1 つ選ぶ部品(SelectOneButton)もある(個人設定の開始曜日。実機で確認)。押す先はボタン、文字は aria-label
    const box = input.closest(".ui-radiobutton")?.querySelector(".ui-radiobutton-box") ?? input.closest(".ui-button") ?? input;
    const label = [...form.querySelectorAll("label")].find((l) => l.htmlFor === input.id)?.textContent ?? input.getAttribute("aria-label");
    return { label: squash(label), ref: assignRef(box), checked: input.checked || box.classList.contains("ui-state-active") };
  });

/**
 * 教室予約(参照のみ)(#funcForm)。条件の欄と、検索後のタイムライン。
 * 副作用: 操作する要素に data-mu-ref を付ける
 */
export function parseRoom(root: Document): RoomPage {
  const form = root.getElementById("funcForm");
  if (!form) throw new ParseError("funcForm がありません");
  const id = (s: string) => root.getElementById(`funcForm:${s}`);
  const range = (a: string, b: string): RoomRange => ({ from: textField(id(a)), to: textField(id(b)) });
  const tables = [...form.querySelectorAll(".ui-selectmanycheckbox")];
  // スイッチの id は生成物。固定 id の行(akiRow)の中の唯一の .ui-chkbox を探す
  const sw = id("akiRow")?.querySelector(".ui-chkbox");
  const swInput = sw?.querySelector<HTMLInputElement>('input[type="checkbox"]');
  const box = sw?.querySelector(".ui-chkbox-box");
  return {
    period: range("targetDateFrom:targetDateFrom_input", "targetDateTo:targetDateTo_input"),
    targets: group(tables.find((t) => t.id.endsWith(":hyojiTaisho"))),
    free: sw && box ? { boxRef: refOf(box), on: !!swInput?.checked || box.classList.contains("ui-state-active"), time: range("targetTimeFrom:time", "targetTimeTo:time"), hour: textField(id("freeHour")), minute: textField(id("freeMinute")) } : null,
    days: group(tables.find((t) => !t.id.endsWith(":hyojiTaisho"))),
    campus: selectField(id("campus_input")),
    building: selectField(id("building_input")),
    floor: selectField(id("kai_input")),
    capacity: { regular: range("shuyoNinzuHeijoFrom", "shuyoNinzuHeijoTo"), exam: range("shuyoNinzuShikenFrom", "shuyoNinzuShikenTo"), entrance: range("shuyoNinzuNyushiFrom", "shuyoNinzuNyushiTo") },
    showCapacity: radios(form),
    capacityKind: selectField(id("shuyoNinzu2_input")),
    searchRef: refOf(id("search")),
    clearRef: refOf(lastButton(form, "クリア") ?? buttonByText(form, "クリア")),
    result: parseRoomResult(root),
  };
}
