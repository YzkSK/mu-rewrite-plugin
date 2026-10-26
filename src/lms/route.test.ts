import { expect, test } from "bun:test";
import { isAppPath, isTargetPath, routeOf } from "./route";

test("対象のパス", () => {
  expect(["/", "/index.php", "/my/", "/login/index.php", "/course/view.php", "/course/edit.php"].map(isTargetPath)).toEqual([true, true, false, false, true, false]);
  expect(["/", "/course/view.php"].map((p) => routeOf(p))).toEqual(["home", "course"]);
});

test("課題: action で分ける。ほかの action は元の画面", () => {
  const p = "/mod/assign/view.php";
  expect([routeOf(p, "?id=1"), routeOf(p, "?id=1&action=editsubmission"), routeOf(p, "?id=1&action=grading")]).toEqual(["assign", "submit", null]);
  expect(isTargetPath(p)).toBe(true);
  expect(isAppPath({ pathname: p, search: "?id=1&action=removesubmissionconfirm" })).toBe(false);
  expect(isAppPath({ pathname: p, search: "?id=1" })).toBe(true);
});

test("元の画面で開くと決めたら対象から外れる(search は見ない)", () => {
  const l = { pathname: "/", search: "?redirect=0" };
  expect(isAppPath(l)).toBe(true);
  expect(isAppPath({ pathname: "/my/", search: "" })).toBe(false);
  sessionStorage.setItem("mu-lms-skip:/?redirect=0", "1");
  expect(isAppPath(l)).toBe(false);
  expect(isAppPath({ pathname: "/course/view.php", search: "?id=1" })).toBe(true); // ほかのページは描く
  sessionStorage.removeItem("mu-lms-skip:/?redirect=0");
});
