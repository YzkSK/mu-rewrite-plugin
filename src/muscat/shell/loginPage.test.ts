import { expect, test } from "bun:test";
import { LOGGED_OUT_KEY, isLoginPage, loginPageAction, publicSyllabusHref } from "./loginPage";

const html = (s: string) => new DOMParser().parseFromString(`<body>${s}</body>`, "text/html");

function store(init: Record<string, string> = {}) {
  const m = { ...init };
  return { m, s: { getItem: (k: string) => m[k] ?? null, setItem: (k: string, v: string) => void (m[k] = v) } };
}

test("isLoginPage: #loginForm の中にパスワード欄がある", () => {
  expect(isLoginPage(html('<form id="loginForm"><input type="password"></form>'))).toBe(true);
  expect(isLoginPage(html('<form id="loginForm"><input type="text"></form>'))).toBe(false);
  expect(isLoginPage(html('<form><input type="password"></form>'))).toBe(false);
});

test("loginPageAction: ログアウトの印 → notice", () => {
  const { s } = store({ [LOGGED_OUT_KEY]: "1" });
  expect(loginPageAction({ storage: s, now: 1_000_000 })).toBe("notice");
});

test("loginPageAction: 30 秒以内に飛ばしていれば notice、過ぎていれば sso で時刻を残す", () => {
  expect(loginPageAction({ storage: store({ "mu-m-sso": "980000" }).s, now: 1_000_000 })).toBe("notice");
  const { m, s } = store({ "mu-m-sso": "960000" });
  expect(loginPageAction({ storage: s, now: 1_000_000 })).toBe("sso");
  expect(m["mu-m-sso"]).toBe("1000000");
  expect(loginPageAction({ storage: store().s, now: 1_000_000 })).toBe("sso");
});

test("loginPageAction: storage が例外 → notice", () => {
  const bad = { getItem: () => { throw new Error("x"); }, setItem: () => {} };
  expect(loginPageAction({ storage: bad, now: 1 })).toBe("notice");
});

test("publicSyllabusHref: 絶対 URL。無ければ空", () => {
  expect(publicSyllabusHref(html('<a href="https://x.test/s">シラバスはこちらから閲覧可能です</a>'))).toBe("https://x.test/s");
  expect(publicSyllabusHref(html("<a href='/a'>別</a>"))).toBe("");
});
