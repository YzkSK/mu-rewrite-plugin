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

/** 元のポータルの検証と同じ手順で戻す(前半が乱数、後半が token と XOR) */
const unmask = (v: string): string => {
  const bin = atob(v.replace(/-/g, "+").replace(/_/g, "/"));
  const b = Uint8Array.from(bin, (ch) => ch.charCodeAt(0));
  const n = b.length / 2;
  return new TextDecoder().decode(b.slice(n).map((x, i) => x ^ b[i]!));
};

test("csrfHeaders: _csrf の token を乱数で XOR して base64url にする(毎回違う値、戻すと token)", () => {
  const c = "x=1; _csrf=" + encodeURIComponent('a:2:{i:0;s:5:"_csrf";i:1;s:32:"abcdEFGH1234abcdEFGH1234abcdEFGH";}');
  const fixed = csrfHeaders(c, (n) => new Uint8Array(n).fill(0));
  expect(unmask(fixed["X-CSRF-Token"]!)).toBe("abcdEFGH1234abcdEFGH1234abcdEFGH");
  const a = csrfHeaders(c)["X-CSRF-Token"]!;
  expect(unmask(a)).toBe("abcdEFGH1234abcdEFGH1234abcdEFGH");
  expect(a).not.toMatch(/[+/=]/);
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
