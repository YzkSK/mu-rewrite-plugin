import { expect, test } from "bun:test";
import { isAppPath, isTargetPath } from "./route";

test("対象のパス", () => {
  expect(["/", "/index.php", "/my/", "/login/index.php", "/course/view.php"].map(isTargetPath)).toEqual([true, true, false, false, false]);
});

test("元の画面で開くと決めたら対象から外れる(search は見ない)", () => {
  const l = { pathname: "/", search: "?redirect=0" };
  expect(isAppPath(l)).toBe(true);
  expect(isAppPath({ pathname: "/my/", search: "" })).toBe(false);
  sessionStorage.setItem("mu-lms-skip", "1");
  expect(isAppPath(l)).toBe(false);
  sessionStorage.removeItem("mu-lms-skip");
});
