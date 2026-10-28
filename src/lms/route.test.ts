import { expect, test } from "bun:test";
import { isAppPath, isSkipped, isTargetPath, routeOf } from "./route";

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

test("フォーラム・メッセージ・教材・検索・プロファイル", () => {
  const ps = ["/mod/forum/view.php", "/mod/forum/discuss.php", "/message/index.php", "/message/output/popup/notifications.php", "/mod/lti/view.php", "/course/search.php", "/user/profile.php"];
  expect(ps.map(isTargetPath)).toEqual(ps.map(() => true));
  expect(ps.map((p) => routeOf(p))).toEqual(["forum", "discussion", "messages", "messages", "lti", "search", "profile"]);
  expect(["/mod/forum/post.php", "/mod/resource/view.php", "/user/edit.php"].map(isTargetPath)).toEqual([false, false, false]);
});

test("マイコース・カレンダー・成績", () => {
  const ps = ["/my/courses.php", "/calendar/view.php", "/grade/report/overview/index.php", "/grade/report/user/index.php"];
  expect(ps.map(isTargetPath)).toEqual([true, true, true, true]);
  expect(ps.map((p) => routeOf(p))).toEqual(["courses", "calendar", "grades", "grades"]);
});

test("isSkipped: 印のあるページ(パス+search)だけ true", () => {
  sessionStorage.setItem("mu-lms-skip:/course/view.php?id=1", "1");
  expect(isSkipped({ pathname: "/course/view.php", search: "?id=1" })).toBe(true);
  expect(isSkipped({ pathname: "/course/view.php", search: "?id=2" })).toBe(false);
  expect(isSkipped({ pathname: "/login/index.php", search: "" })).toBe(false);
});
