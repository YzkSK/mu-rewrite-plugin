import type { RoomBar, RoomLegend, RoomResult, RoomRow } from "../types";
import { squash } from "./genericControls";
import { refOf, selectField } from "./liveFields";

const kindName = (el: Element) => {
  const m = /\bzone(\w)(\w*)/.exec(el.className);
  return m ? m[1]!.toLowerCase() + m[2] : "";
};
const px = (style: string, prop: string) => Number(new RegExp(`${prop}:\\s*(-?\\d+(?:\\.\\d+)?)px`).exec(style)?.[1] ?? 0);

/** 1 分 = 1px、半時間のマス = 30px。left は枠線の分だけ 1px 手前から始まる */
function parseBar(a: Element, base: number): RoomBar {
  const style = a.getAttribute("style") ?? "";
  const start = base + px(style, "left") + 1;
  return {
    kind: kindName(a),
    text: squash(a.textContent),
    title: squash(a.getAttribute("title")),
    start,
    end: start + px(style, "width"),
    lane: Math.max(0, Math.round(px(style, "top") / 30)),
    openRef: refOf(a),
  };
}

/**
 * 教室予約のタイムライン(#funcForm:yoyakuArea)。時刻見出しの th は 1 時間ぶん、本体のマスは半時間ぶん。
 * 予約は a.timezone で、置かれたマスの位置 + style の left / width が時間。副作用: 操作する要素に data-mu-ref を付ける
 */
export function parseRoomResult(root: Document): RoomResult | null {
  const area = root.getElementById("funcForm:yoyakuArea");
  const table = area?.querySelector("table");
  if (!area || !table) return null;
  const ths = [...table.querySelectorAll("thead th")];
  const hours = ths.map((th) => /^(\d+):00$/.exec(squash(th.textContent))).flatMap((m) => (m ? [Number(m[1])] : []));
  if (!hours.length) return null;
  const offset = ths.findIndex((th) => /^\d+:00$/.test(squash(th.textContent)));
  const capCol = ths.findIndex((th) => squash(th.textContent).includes("収容"));
  const from = hours[0]! * 60;
  const trs = [...table.querySelectorAll("tbody.ui-datatable-data > tr")];
  const date = squash(trs.find((tr) => tr.classList.contains("reserveDate"))?.textContent);
  const rooms: RoomRow[] = trs
    .filter((tr) => !tr.classList.contains("reserveDate") && !tr.classList.contains("ui-datatable-empty-message"))
    .map((tr) => {
      const td = [...tr.children];
      const label = td[0]?.querySelector(".kstNameArea")?.cloneNode(true) as Element | undefined;
      label?.querySelectorAll("button").forEach((b) => b.remove());
      return {
        name: squash(label?.textContent ?? td[0]?.textContent),
        capacity: capCol >= 0 ? squash(td[capCol]?.textContent) : "",
        infoRef: refOf(td[0]?.querySelector(".roomInfoBtn")),
        bars: td.flatMap((cell, i) => [...cell.querySelectorAll("a.timezone")].map((a) => parseBar(a, from + (i - offset) * 30))),
      };
    });
  const legend: RoomLegend[] = [...area.querySelectorAll(".exampleRoomStatus")]
    .filter((s) => !s.parentElement?.classList.contains("dispNone"))
    .map((s) => ({ kind: kindName(s), label: squash(s.parentElement?.textContent) }));
  const byText = (t: string) => [...area.querySelectorAll("button")].find((b) => squash(b.textContent).includes(t));
  return {
    date,
    dates: selectField(root.getElementById("funcForm:targetDate_input")),
    moveRef: refOf(byText("指定日へ移動")),
    prevRef: refOf(root.getElementById("funcForm:nextBtn")),
    nextRef: refOf(root.getElementById("funcForm:forwardBtn")),
    legend,
    from,
    to: hours[hours.length - 1]! * 60 + 60,
    rooms,
  };
}
