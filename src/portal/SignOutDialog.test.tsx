import { afterEach, expect, test } from "bun:test";
import { createRoot, type Root } from "react-dom/client";
import { csrfHeaders } from "./api";
import { SignOutDialog } from "./SignOutDialog";

const flush = () => new Promise((r) => setTimeout(r, 30));
let root: Root;
let host: HTMLElement;
afterEach(() => { root?.unmount(); host?.remove(); });

const mount = (fetcher: (u: string, init?: RequestInit) => Promise<Response>) => {
  globalThis.fetch = fetcher as unknown as typeof fetch;
  host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);
  let closed = 0;
  root.render(<SignOutDialog onClose={() => closed++} />);
  return () => closed;
};
const btn = (t: string) => [...host.querySelectorAll("button")].find((b) => b.textContent === t)!;

test("csrfHeaders: _csrf と XSRF-TOKEN をデコードして返す", () => {
  const c = "x=1; _csrf=" + encodeURIComponent('a:2:{i:0;s:5:"_csrf";i:1;s:32:"abcdEFGH1234abcdEFGH1234abcdEFGH";}') + "; XSRF-TOKEN=" + encodeURIComponent("t o/k");
  expect(csrfHeaders(c)).toEqual({ "X-CSRF-Token": "abcdEFGH1234abcdEFGH1234abcdEFGH", "X-XSRF-TOKEN": "t o/k" });
  expect(csrfHeaders("a=b")).toEqual({});
  expect(csrfHeaders("_csrf=%E0%A4%A")).toEqual({}); // 壊れた値は無視
});

test("サインアウト: 確認の前は通信せず、押すと GET /api/auth/logout", async () => {
  const calls: { u: string; init?: RequestInit }[] = [];
  const assigned: string[] = [];
  const loc = location as unknown as { assign: (u: string) => void };
  const orig = loc.assign;
  loc.assign = (u) => { assigned.push(u); };
  try {
    mount(async (u, init) => { calls.push({ u, init }); return new Response(JSON.stringify({ is_successful: true, result: {} })); });
    await flush();
    expect(host.textContent).toContain("サインアウトしますか?");
    expect(calls.length).toBe(0);
    btn("サインアウト").click();
    await flush();
    expect(calls.map((c) => c.u)).toEqual(["/api/auth/logout"]);
    expect(calls[0]!.init?.method ?? "GET").toBe("GET");
    expect(assigned).toEqual(["/login"]);
  } finally { loc.assign = orig; }
});

test("サインアウト: 失敗したら表示してキャンセルできる", async () => {
  const closed = mount(async () => new Response("", { status: 500 }));
  await flush();
  btn("サインアウト").click();
  await flush();
  expect(host.textContent).toContain("サインアウトできませんでした");
  btn("キャンセル").click();
  expect(closed()).toBe(1);
});
