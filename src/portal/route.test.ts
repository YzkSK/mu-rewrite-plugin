import { expect, test } from "bun:test";
import { isAppPath, isSkippedPath, isNoticesPath, isTargetPath, isTopPath, NOTICES_URL, routeOf, slugOf } from "./route";

test("お知らせ一覧のパス: ?view=all のときだけ", () => {
  const p = "/dashboard/page/" + encodeURIComponent("お知らせ");
  expect(isNoticesPath(p, "?view=all")).toBe(true);
  expect(isNoticesPath(p, "?view=all&category=x")).toBe(true);
  expect(isNoticesPath(p, "")).toBe(false);
  expect(isNoticesPath("/dashboard", "?view=all")).toBe(false);
  expect(isAppPath({ pathname: p, search: "?view=all" })).toBe(true);
  expect(isAppPath({ pathname: p, search: "" })).toBe(true); // 一覧でなければ通常のページとして描く
  expect(isAppPath({ pathname: "/dashboard", search: "" })).toBe(true);
  expect(isAppPath({ pathname: "/elsewhere", search: "" })).toBe(false);
  const [path, search] = NOTICES_URL.split("?");
  expect(routeOf({ pathname: path!, search: "?" + search })).toBe("notices");
  expect(routeOf({ pathname: "/dashboard", search: "" })).toBe("top");
  expect(routeOf({ pathname: p, search: "" })).toBe("page");
  expect(routeOf({ pathname: "/dashboard/page/" + encodeURIComponent("奨学金"), search: "" })).toBe("page");
});

test("元の画面で開くと決めたページは対象から外れる", () => {
  const l = { pathname: "/dashboard/page/" + encodeURIComponent("奨学金"), search: "" };
  expect(isAppPath(l)).toBe(true);
  sessionStorage.setItem("mu-portal-skip:奨学金", "1");
  expect(isAppPath(l)).toBe(false);
  expect(isAppPath({ pathname: "/dashboard/page/" + encodeURIComponent("証明書"), search: "" })).toBe(true);
  sessionStorage.removeItem("mu-portal-skip:奨学金");
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

test("isSkippedPath: 印のあるページだけ true", () => {
  sessionStorage.setItem("mu-portal-skip:abc", "1");
  expect(isSkippedPath("/dashboard/page/abc")).toBe(true);
  expect(isSkippedPath("/dashboard/page/other")).toBe(false);
  expect(isSkippedPath("/elsewhere")).toBe(false);
});
