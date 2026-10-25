import { expect, test } from "bun:test";
import { isTargetPath, isTopPath, slugOf } from "./route";

test("対象のパス", () => {
  expect(["/dashboard", "/dashboard/page/x", "/other", "/dashboard/page/%E0%A4%A"].map(isTargetPath)).toEqual([true, true, false, false]);
});

test("slug と トップページ判定", () => {
  expect(slugOf("/dashboard")).toBe("トップページ");
  expect(slugOf("/dashboard/page/" + encodeURIComponent("お知らせ"))).toBe("お知らせ");
  expect(isTopPath("/dashboard")).toBe(true);
  expect(isTopPath("/dashboard/page/" + encodeURIComponent("トップページ"))).toBe(true);
  expect(isTopPath("/dashboard/page/" + encodeURIComponent("お知らせ"))).toBe(false);
  expect(isTopPath("/elsewhere")).toBe(false);
});
