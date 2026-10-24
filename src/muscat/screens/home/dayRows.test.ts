import { expect, test } from "bun:test";
import type { HomeDayItem } from "@/muscat/api/types";
import { dateTitle, dayRows, daysFrom, isSameDay, periodOf } from "./dayRows";

test("daysFrom: 画面の日付が今日から何日先か。月をまたいでも数える。読めなければ 0", () => {
  const now = new Date(2026, 9, 25, 23, 0);
  expect(daysFrom("2026/10/27(火)", now)).toBe(2);
  expect(daysFrom("2026/10/25(日)", now)).toBe(0);
  expect(daysFrom("2026/10/23(金)", now)).toBe(-2);
  expect(daysFrom("2026/11/01(日)", now)).toBe(7);
  expect(daysFrom("?", now)).toBe(0);
});

const item = (title: string, start: string, o: Partial<HomeDayItem> = {}): HomeDayItem => ({
  start, end: "", title, teachers: [], room: "", keijiCount: 0, syllabusRef: "", memo: null, plain: false, ...o,
});

test("開始時刻から時限(先頭の 0 は無視)。一致しなければ null", () => {
  expect([periodOf("8:50"), periodOf("08:50"), periodOf("20:20"), periodOf("9:00")]).toEqual([1, 1, 7, null]);
});

test("1〜7 限の行。授業が無い時限は空き", () => {
  const { rows } = dayRows([item("甲", "10:40")]);
  expect(rows.map((r) => [r.periods, r.item?.title ?? null])).toEqual([[[1], null], [[2], "甲"], [[3], null], [[4], null], [[5], null], [[6], null], [[7], null]]);
  expect(rows[1]).toMatchObject({ start: "10:40", end: "12:20" });
});

test("同じ授業の続く時限は 1 行(3・4 限は 13:10〜16:40)。別の授業はまとめない", () => {
  const { rows } = dayRows([item("甲", "13:10"), item("甲", "15:00"), item("乙", "16:50")]);
  expect(rows.filter((r) => r.item).map((r) => [r.periods, r.start, r.end, r.item!.title])).toEqual([
    [[3, 4], "13:10", "16:40", "甲"],
    [[5], "16:50", "18:30", "乙"],
  ]);
});

test("2 限と 3 限(昼休み)はまとめない", () => {
  const { rows } = dayRows([item("甲", "10:40"), item("甲", "13:10")]);
  expect(rows.filter((r) => r.item).map((r) => r.periods)).toEqual([[2], [3]]);
});

test("授業ではない予定と、時限に当てはまらない予定は extras", () => {
  const plain = item("面談", "9:00", { plain: true });
  const odd = item("丙", "9:00");
  const dup = item("丁", "8:50");
  const { rows, extras } = dayRows([item("甲", "8:50"), plain, odd, dup]);
  expect(extras).toEqual([plain, odd, dup]);
  expect(rows[0]!.item!.title).toBe("甲");
});

test("日付の題名と、今日かどうか", () => {
  expect(dateTitle("2026/10/27(火)")).toBe("10月27日(火)");
  expect(dateTitle("?")).toBe("?");
  expect(isSameDay("2026/10/27(火)", new Date(2026, 9, 27, 23, 0))).toBe(true);
  expect(isSameDay("2026/10/27(火)", new Date(2026, 9, 28))).toBe(false);
});
