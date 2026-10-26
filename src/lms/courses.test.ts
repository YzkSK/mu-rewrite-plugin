import { expect, test } from "bun:test";
import { readSlot } from "./course";
import { placeCourses, termOfMonth, type MyCourse } from "./courses";

test("readSlot: 学期・曜日・時限", () => {
  expect(readSlot("333 専門")).toEqual({ term: 3, day: 3, period: 3 });
  expect(readSlot("399 英語")).toEqual({ term: 3, day: null, period: null });
  expect(readSlot("193 x")).toEqual({ term: 1, day: null, period: 3 });
  expect(readSlot("533 x")).toBeNull();
  expect(readSlot("英語 333")).toBeNull();
});

test("termOfMonth", () => {
  expect([1, 3, 4, 5, 6, 7, 8, 11, 12].map(termOfMonth)).toEqual([4, 4, 1, 1, 2, 2, 3, 3, 4]);
});

test("placeCourses: 時間割・曜日時限なし・そのほか", () => {
  const c = (id: number, name: string): MyCourse => ({ id, name, url: `/c/${id}` });
  const p = placeCourses([c(1, "333 A"), c(2, "333 B"), c(3, "399 C"), c(4, "111 D"), c(5, "ゼミ")], 3);
  expect(p.grid["3-3"]!.map((x) => x.id)).toEqual([1, 2]);
  expect(p.noSlot.map((x) => x.id)).toEqual([3]);
  expect(p.other.map((x) => x.id)).toEqual([5]);
  expect(Object.keys(p.grid)).toEqual(["3-3"]);
});
