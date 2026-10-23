import { expect, test } from "bun:test";
import type { TimetableEntry } from "@/muscat/api/types";
import { toBlocks } from "./blocks";

const e = (period: number, code: string, day: TimetableEntry["day"] = "月"): TimetableEntry => ({
  day, period, code, subject: `科目${code}`, teacher: "", room: "", campus: "", credits: 2,
});

test("連続する 3・4 限の同じ授業は 1 枚", () => {
  const b = toBlocks([e(3, "A"), e(4, "A")]);
  expect(b).toHaveLength(1);
  expect(b[0]).toMatchObject({ day: "月", start: 3, end: 4 });
});

test("2・3 限にまたがる同じ授業は昼休みで 2 枚", () => {
  const b = toBlocks([e(2, "A"), e(3, "A")]);
  expect(b.map((x) => [x.start, x.end])).toEqual([[2, 2], [3, 3]]);
});

test("別の授業が隣り合ってもまとめない", () => {
  expect(toBlocks([e(3, "A"), e(4, "B")])).toHaveLength(2);
});

test("同じ授業でも曜日が違えばまとめない", () => {
  expect(toBlocks([e(3, "A", "月"), e(4, "A", "火")])).toHaveLength(2);
});

test("離れたコマはまとめない", () => {
  expect(toBlocks([e(1, "A"), e(3, "A")])).toHaveLength(2);
});

test("空なら空", () => {
  expect(toBlocks([])).toEqual([]);
});
