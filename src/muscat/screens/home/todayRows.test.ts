import { expect, test } from "bun:test";
import type { HomeLesson } from "@/muscat/api/types";
import { todayRows } from "./todayRows";

const lesson = (title: string, ...slots: [string, number][]): HomeLesson => ({
  slots: slots.map(([weekday, period]) => ({ weekday, period })), title, teachers: ["教員"], room: "101", keijiCount: 1,
});

test("今日の曜日だけ。授業が無ければ空", () => {
  const ls = [lesson("甲", ["月", 1], ["火", 2])];
  expect(todayRows(ls, "月").map((r) => r.periods)).toEqual([[1]]);
  expect(todayRows(ls, "水")).toEqual([]);
});

test("連続する時限は 1 行、離れていれば別の行、重複は 1 つ", () => {
  const rows = todayRows([lesson("甲", ["月", 4], ["月", 5], ["月", 5], ["月", 7])], "月");
  expect(rows.map((r) => r.periods)).toEqual([[4, 5], [7]]);
  expect(rows[0]).toMatchObject({ title: "甲", teachers: ["教員"], room: "101", keijiCount: 1 });
});

test("3 限の前では必ず区切る(2・3 限は別の行)", () => {
  expect(todayRows([lesson("甲", ["月", 2], ["月", 3], ["月", 4])], "月").map((r) => r.periods)).toEqual([[2], [3, 4]]);
});

test("授業をまたいで開始時限の順に並ぶ", () => {
  const rows = todayRows([lesson("後", ["金", 5]), lesson("先", ["金", 1]), lesson("中", ["金", 3])], "金");
  expect(rows.map((r) => r.title)).toEqual(["先", "中", "後"]);
});
