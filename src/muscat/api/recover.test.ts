import { expect, test } from "bun:test";
import { MuscatDownError, SsoRequiredError } from "./errors";
import { fetchHome, recover, type Fetch } from "./recover";

const ORIGIN = "https://muscat.example";
const relay = `<form id="loginForm" action="/uprx/login.xhtml"><input name="jakarta.faces.ViewState" value="vsR"><input name="loginForm:autoLogin" type="hidden"></form>`;
const home = `<form id="menuForm" action="/uprx/up/bs/Bsa00101.xhtml"></form>`;

function res(body: string, o: { status?: number; redirected?: boolean; url?: string } = {}) {
  const r = new Response(body, { status: o.status ?? 200 });
  Object.defineProperty(r, "redirected", { value: o.redirected ?? false });
  Object.defineProperty(r, "url", { value: o.url ?? `${ORIGIN}/x` });
  return r;
}

// 時計を進めて 30 秒制限をテスト間で跨がせない
let clock = 0;
const tick = () => (clock += 100_000);

function fake(...responses: Response[]) {
  const calls: { url: string; init?: RequestInit }[] = [];
  const f: Fetch = async (url, init) => {
    calls.push({ url, init });
    const r = responses.shift();
    if (!r) throw new Error("no more responses");
    return r;
  };
  return { f, calls };
}

test("中継 → autoLogin POST → ホームの Document", async () => {
  const { f, calls } = fake(res(relay), res(home));
  const doc = await recover(f, tick);
  expect(doc.getElementById("menuForm")).not.toBeNull();
  expect(calls[0]!.url).toContain("/uprx/ShibbolethAuthServlet");
  expect(calls[1]!.url.endsWith("/uprx/login.xhtml")).toBe(true);
  const body = new URLSearchParams(String(calls[1]!.init!.body));
  expect(body.get("loginForm:autoLogin")).toBe("loginForm:autoLogin");
  expect(body.get("jakarta.faces.ViewState")).toBe("vsR");
});

test("loginForm なし・別オリジン・fetch 例外は SsoRequiredError", async () => {
  await expect(recover(fake(res("<p>x</p>")).f, tick)).rejects.toThrow(SsoRequiredError);
  await expect(
    recover(fake(res(relay, { redirected: true, url: "https://idp.example/login" })).f, tick),
  ).rejects.toThrow(SsoRequiredError);
  const boom: Fetch = async () => {
    throw new TypeError("network");
  };
  await expect(recover(boom, tick)).rejects.toThrow(SsoRequiredError);
});

test("POST が 500 → MuscatDownError", async () => {
  await expect(recover(fake(res(relay), res("", { status: 500 })).f, tick)).rejects.toThrow(
    MuscatDownError,
  );
});

test("fetchHome は回数の制限なしで、続けて呼べる", async () => {
  const { f, calls } = fake(res(relay), res(home), res(relay), res(home));
  await fetchHome(f);
  expect((await fetchHome(f)).getElementById("menuForm")).not.toBeNull();
  expect(calls.length).toBe(4);
});

test("30 秒以内の 2 回目は fetch を呼ばない", async () => {
  const t = tick();
  const a = fake(res(relay), res(home));
  await recover(a.f, () => t);
  const b = fake(res(relay), res(home));
  await expect(recover(b.f, () => t + 29_000)).rejects.toThrow(MuscatDownError);
  expect(b.calls.length).toBe(0);
});
