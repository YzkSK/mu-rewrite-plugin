import type { RoomBar, RoomLegend, RoomResult, RoomRow } from "../types";
import { squash } from "./genericControls";
import { refOf, selectField } from "./liveFields";

const kindName = (el: Element) => {
  const m = /\bzone(\w)(\w*)/.exec(el.className);
  return m ? m[1]!.toLowerCase() + m[2] : "";
};
const px = (style: string, prop: string) => Number(new RegExp(`${prop}:\\s*(-?\\d+(?:\\.\\d+)?)px`).exec(style)?.[1] ?? 0);

type RefFn = (el: Element | null | undefined) => string;

/** 1 分 = 1px、半時間のマス = 30px。left は枠線の分だけ 1px 手前から始まる */
function parseBar(a: Element, base: number, ref: RefFn): RoomBar {
  const style = a.getAttribute("style") ?? "";
  const start = base + px(style, "left") + 1;
  return {
    kind: kindName(a),
    text: squash(a.textContent),
    title: squash(a.getAttribute("title")),
    start,
    end: start + px(style, "width"),
    lane: Math.max(0, Math.round(px(style, "top") / 30)),
    openRef: ref(a),
  };
}

/** 本表の見出しから、時刻の基準(from)・時刻の列の先頭(offset)・収容人数の列(capCol)を求める。時刻の見出しが無ければ null */
export function tableLayout(table: Element) {
  const ths = [...table.querySelectorAll("thead th")];
  const hours = ths.map((th) => /^(\d+):00$/.exec(squash(th.textContent))).flatMap((m) => (m ? [Number(m[1])] : []));
  if (!hours.length) return null;
  return {
    hours,
    from: hours[0]! * 60,
    offset: ths.findIndex((th) => /^\d+:00$/.test(squash(th.textContent))),
    capCol: ths.findIndex((th) => squash(th.textContent).includes("収容")),
  };
}

/** 日付の行と空の行は教室ではない */
export const isRoomRow = (tr: Element) => !tr.classList.contains("reserveDate") && !tr.classList.contains("ui-datatable-empty-message");

/** 行の教室名。全角で来る(「有明１－１１Ａ」。実機で確認)ので半角にそろえる */
export function roomNameOf(tr: Element): string {
  const td = tr.children[0];
  const label = td?.querySelector(".kstNameArea")?.cloneNode(true) as Element | undefined;
  label?.querySelectorAll("button").forEach((b) => b.remove());
  return squash(label?.textContent ?? td?.textContent).normalize("NFKC");
}

/** 教室 1 行(tr)を読む。ref は操作用の印を付ける関数(別の Document の行では印を付けない) */
export function parseRoomRow(tr: Element, { from, offset, capCol }: Pick<NonNullable<ReturnType<typeof tableLayout>>, "from" | "offset" | "capCol">, ref: RefFn = refOf): RoomRow {
  const td = [...tr.children];
  return {
    date: "",
    name: roomNameOf(tr),
    capacity: capCol >= 0 ? squash(td[capCol]?.textContent) : "",
    infoRef: ref(td[0]?.querySelector(".roomInfoBtn")),
    bars: td.flatMap((cell, i) => [...cell.querySelectorAll("a.timezone")].map((a) => parseBar(a, from + (i - offset) * 30, ref))),
  };
}

/** 本表・続きの行を読む。期間の日ごとに日付の行が挟まるので、各教室にその日付を付ける(続きの先頭は日付の行が無く "" のまま) */
export function parseRoomRows(trs: Element[], layout: Parameters<typeof parseRoomRow>[1], ref: RefFn = refOf): RoomRow[] {
  let date = "";
  return trs.flatMap((tr) => {
    if (tr.classList.contains("reserveDate")) {
      date = squash(tr.textContent);
      return [];
    }
    return isRoomRow(tr) && tr.children.length > 0 ? [{ ...parseRoomRow(tr, layout, ref), date }] : [];
  });
}

/**
 * 教室予約のタイムライン(#funcForm:yoyakuArea)。時刻見出しの th は 1 時間ぶん、本体のマスは半時間ぶん。
 * 予約は a.timezone で、置かれたマスの位置 + style の left / width が時間。副作用: 操作する要素に data-mu-ref を付ける
 */
export function parseRoomResult(root: Document): RoomResult | null {
  const area = root.getElementById("funcForm:yoyakuArea");
  const table = area?.querySelector("table");
  if (!area || !table) return null;
  const layout = tableLayout(table);
  if (!layout) return null;
  const { hours, from } = layout;
  const trs = [...table.querySelectorAll("tbody.ui-datatable-data > tr")];
  const date = squash(trs.find((tr) => tr.classList.contains("reserveDate"))?.textContent);
  const rooms = parseRoomRows(trs, layout);
  const legend: RoomLegend[] = [...area.querySelectorAll(".exampleRoomStatus")]
    .filter((s) => !s.parentElement?.classList.contains("dispNone"))
    .map((s) => ({ kind: kindName(s), label: squash(s.parentElement?.textContent) }));
  return {
    date,
    dates: selectField(root.getElementById("funcForm:targetDate_input")),
    legend,
    from,
    to: hours[hours.length - 1]! * 60 + 60,
    rooms,
  };
}
