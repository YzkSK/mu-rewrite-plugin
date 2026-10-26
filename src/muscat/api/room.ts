import type { Core } from "./core";
import type { DriveStep } from "./driver/drive";
import { parseRoom } from "./parse/room";
import type { CheckOption, RoomPage, RoomRange } from "./types";

/** 画面の値。ref をキーに持つ */
export type RoomValues = { text: Record<string, string>; on: Record<string, boolean> };

/** 値を持つ欄(入力・select) */
export const fieldsOf = (p: RoomPage): { ref: string; value: string }[] => {
  const range = (r: RoomRange) => [r.from, r.to];
  const { regular, exam, entrance } = p.capacity;
  return [
    ...range(p.period), ...(p.free ? [...range(p.free.time), p.free.hour, p.free.minute] : []),
    ...range(regular), ...range(exam), ...range(entrance),
    p.campus, p.building, p.floor, p.capacityKind,
  ].filter((f) => f.ref);
};
export const checksOf = (p: RoomPage): CheckOption[] => [...p.targets, ...p.days, ...p.showCapacity, ...(p.free ? [{ label: "", ref: p.free.boxRef, checked: p.free.on }] : [])].filter((c) => c.ref);

/** 生きたページの教室予約(参照のみ)(条件の欄と、検索後のタイムライン)を読む */
export const readRoom = (core: Core): Promise<RoomPage> => core.runLive(async (live) => parseRoom(live.doc));

/** 値を元の画面の部品に入れる(検索ボタンは押さない。通信は呼び出し側が直接送る)。チェックは違うものだけ押す(空き教室のスイッチは時刻の欄より先) */
export const fillRoom = (core: Core, v: RoomValues): Promise<void> =>
  core.runLive(async (live) => {
    const p = parseRoom(live.doc);
    const radio = new Set(p.showCapacity.map((c) => c.ref));
    const steps: DriveStep[] = [
      ...checksOf(p).filter((c) => (radio.has(c.ref) ? v.on[c.ref] && !c.checked : v.on[c.ref] !== c.checked)).map((c): DriveStep => ({ kind: "click", ref: c.ref })),
      ...fieldsOf(p).map((f): DriveStep => ({ kind: "set", ref: f.ref, value: v.text[f.ref] ?? f.value })),
    ];
    await live.drive(steps);
  });
