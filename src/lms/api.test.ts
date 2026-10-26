import { afterEach, expect, test } from "bun:test";
import { ajax, fetchUserName, LoginRequiredError, setSesskey } from "./api";

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
