import { expect, test } from "bun:test";
import { decide, isLoggedIn, logoutHref, markLoggedOut, peekLoggedOut, readSesskey, readUserId, watchLogout } from "./login";

const page = (html: string): Document => new DOMParser().parseFromString(html, "text/html");

test("ログイン中かはログアウトのリンクで決まる", () => {
  expect(isLoggedIn(page('<a href="https://x/login/logout.php?sesskey=abc">ログアウト</a>'))).toBe(true);
  expect(isLoggedIn(page('<a href="https://x/login/index.php">ログイン</a>'))).toBe(false);
  expect(logoutHref(page('<a href="https://x/login/logout.php?sesskey=abc">x</a>'))).toBe("https://x/login/logout.php?sesskey=abc");
  expect(logoutHref(page("<p></p>"))).toBeNull();
});

test("script から sesskey と userId を読む", () => {
  const d = page('<script src="a.js"></script><script>var a=1;</script><script>M.cfg = {"sesskey":"AbC123","x":1};M.u={"userId":4321}</script>');
  expect(readSesskey(d)).toBe("AbC123");
  expect(readUserId(d)).toBe(4321);
  expect(readSesskey(page("<script>var a=1</script>"))).toBeNull();
  expect(readUserId(page("<p></p>"))).toBeNull();
});

test("ログアウトのリンクを押すと印が付く(それ以外では付かない)", () => {
  sessionStorage.removeItem("mu-lms-loggedout");
  watchLogout(document);
  document.body.innerHTML = '<a id="o" href="/login/logout.php?sesskey=a"><span id="in">出る</span></a><a id="x" href="/my/">他</a>';
  document.getElementById("x")!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  expect(peekLoggedOut()).toBeNull();
  document.getElementById("in")!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  expect(peekLoggedOut()).not.toBeNull();
  sessionStorage.removeItem("mu-lms-loggedout");
  markLoggedOut();
  expect(peekLoggedOut()).not.toBeNull();
  sessionStorage.removeItem("mu-lms-loggedout");
});

test("decide: 全分岐", () => {
  const now = 1_000_000;
  const base = { loggedIn: false, loggedOutAt: null, triedAt: null, now };
  expect(decide({ ...base, loggedIn: true, loggedOutAt: now, triedAt: now })).toBe("app");
  expect(decide({ ...base, loggedOutAt: now - 5 })).toBe("loggedout");
  expect(decide({ ...base, loggedOutAt: now - 5, triedAt: now })).toBe("loggedout");
  expect(decide({ ...base, triedAt: now - 59_000 })).toBe("failed");
  expect(decide({ ...base, triedAt: now - 61_000 })).toBe("login");
  expect(decide(base)).toBe("login");
});
