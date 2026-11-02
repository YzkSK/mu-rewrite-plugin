import { afterEach, expect, test } from "bun:test";
import { ajax, fetchPage, fetchUserName, isLoginRedirect, LoginRequiredError, setSesskey } from "./api";

const real = globalThis.fetch;
afterEach(() => { globalThis.fetch = real; });
const reply = (body: unknown, calls: { url: string; init: RequestInit }[] = []) => {
  globalThis.fetch = (async (url: string, init: RequestInit) => { calls.push({ url, init }); return new Response(JSON.stringify(body)); }) as unknown as typeof fetch;
};

test("正常: 送るものと data を返す", async () => {
  setSesskey("S1");
  const calls: { url: string; init: RequestInit }[] = [];
  reply([{ error: false, data: { a: 1 } }], calls);
  expect(await ajax("m_x", { k: 1 })).toEqual({ a: 1 });
  expect(calls[0]!.url).toBe("/lib/ajax/service.php?sesskey=S1&info=m_x");
  expect(calls[0]!.init.credentials).toBe("include");
  expect(JSON.parse(calls[0]!.init.body as string)).toEqual([{ index: 0, methodname: "m_x", args: { k: 1 } }]);
});

test("error と配列でない応答は throw、servicerequireslogin は LoginRequiredError", async () => {
  reply([{ error: true, exception: { message: "bad", errorcode: "x" } }]);
  expect(ajax("m", {})).rejects.toThrow("bad");
  reply({ oops: 1 });
  expect(ajax("m", {})).rejects.toThrow();
  reply([{ error: true, exception: { errorcode: "servicerequireslogin" } }]);
  expect(ajax("m", {})).rejects.toBeInstanceOf(LoginRequiredError);
});

test("名前は姓・名の 2 つを半角空白でつなぐ", async () => {
  const calls: { url: string; init: RequestInit }[] = [];
  reply([{ error: false, data: [{ fullname: "佐藤　康樹 サトウ　コウキ" }] }], calls);
  expect(await fetchUserName(7)).toBe("佐藤 康樹");
  expect(JSON.parse(calls[0]!.init.body as string)[0].args).toEqual({ referenceuserid: 7, userids: [7], includecontactrequests: false, includeprivacyinfo: false });
});

/** 1 回目(ページ)は page、2 回目以降(ajax での確かめ)は check を返す。呼ばれた url を記録する */
const sequence = (page: () => Response, check: () => Response) => {
  const urls: string[] = [];
  globalThis.fetch = (async (url: string) => { urls.push(String(url)); return urls.length === 1 ? page() : check(); }) as unknown as typeof fetch;
  return urls;
};
const netError = (): Response => { throw new TypeError("Failed to fetch"); };
const ajaxReply = (body: unknown) => () => new Response(JSON.stringify(body));

test("fetchPage: SSO への転送(TypeError)+ ajax がログイン切れなら LoginRequiredError", async () => {
  sequence(netError, ajaxReply([{ error: true, exception: { errorcode: "servicerequireslogin" } }]));
  await expect(fetchPage("/my/")).rejects.toBeInstanceOf(LoginRequiredError);
});

test("fetchPage: TypeError + ajax が別の失敗なら元の TypeError。元のリクエストは 1 回だけ", async () => {
  const urls = sequence(netError, ajaxReply([{ error: true, exception: { errorcode: "other" } }]));
  await expect(fetchPage("/my/", { method: "POST" })).rejects.toThrow("Failed to fetch");
  expect(urls.filter((u) => u === "/my/")).toHaveLength(1);
});

test("fetchPage: body.notloggedin(ゲストページ)は LoginRequiredError", async () => {
  sequence(() => new Response("<body class='x notloggedin'></body>", { status: 404 }), ajaxReply([]));
  await expect(fetchPage("/mod/assign/view.php?id=1")).rejects.toBeInstanceOf(LoginRequiredError);
});

test("fetchPage: 通常のページは Response を返し、本文を読める", async () => {
  // url が空だと今のページで判定され、他のテストが置いた location に左右される
  sequence(() => Object.defineProperty(new Response("<body class='path-my'>hi</body>"), "url", { value: "https://lms/my/" }), ajaxReply([]));
  const r = await fetchPage("/my/");
  expect(await r.text()).toContain("hi");
});

test("isLoginRedirect: /login/ 配下だけ true、url が空でも落ちない", () => {
  expect(isLoginRedirect({ url: "https://x.test/login/index.php" } as Response)).toBe(true);
  expect(isLoginRedirect({ url: "https://x.test/mod/assign/view.php?x=/login/" } as Response)).toBe(false);
  expect(() => isLoginRedirect({} as Response)).not.toThrow(); // url なしは今のページで判定
});
