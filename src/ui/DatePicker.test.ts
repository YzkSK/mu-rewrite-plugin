import { expect, test } from "bun:test";
import { monthCells, parseYmd } from "./DatePicker";

test("日付の文字を読む。形が違えば null", () => {
  expect(parseYmd("2026/10/25")).toEqual({ y: 2026, m: 9, d: 25 });
  expect(parseYmd("2026-10-25")).toBeNull();
});

test("月のマスは日曜始まりで 7 の倍数。2026 年 10 月は木曜始まりの 31 日", () => {
  const c = monthCells(2026, 9);
  expect(c.length % 7).toBe(0);
  expect(c.slice(0, 5)).toEqual([null, null, null, null, 1]);
  expect(c.filter((d) => d !== null)).toHaveLength(31);
});
