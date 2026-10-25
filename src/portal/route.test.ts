import { expect, test } from "bun:test";
import { isAppPath, isNoticesPath, isTargetPath, isTopPath, NOTICES_URL, routeOf, slugOf } from "./route";

test("お知らせ一覧のパス: ?view=all のときだけ", () => {
  const p = "/dashboard/page/" + encodeURIComponent("お知らせ");
  expect(isNoticesPath(p, "?view=all")).toBe(true);
  expect(isNoticesPath(p, "?view=all&category=x")).toBe(true);
  expect(isNoticesPath(p, "")).toBe(false);
  expect(isNoticesPath("/dashboard", "?view=all")).toBe(false);
  expect(isAppPath({ pathname: p, search: "?view=all" })).toBe(true);
  expect(isAppPath({ pathname: p, search: "" })).toBe(false);
  expect(isAppPath({ pathname: "/dashboard", search: "" })).toBe(true);
  const [path, search] = NOTICES_URL.split("?");
  expect(routeOf({ pathname: path!, search: "?" + search })).toBe("notices");
  expect(routeOf({ pathname: "/dashboard", search: "" })).toBe("top");
});

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
