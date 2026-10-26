import { expect, test } from "bun:test";
import { reenter, shouldReenter, type ReenterDeps } from "./reenter";

const mk = (over: Partial<ReenterDeps> = {}) => {
  const store: Record<string, string> = {};
  const calls: string[] = [];
  const deps: ReenterDeps = {
    loggedIn: false,
    pathname: "/uprx/up/bs/bsa001/Bsa00101.xhtml",
    storage: { getItem: (k) => store[k] ?? null, setItem: (k, v) => void (store[k] = v) },
    now: 100_000,
    reportBounce: async () => void calls.push("bounce"),
    replace: (u) => void calls.push(u),
    ...over,
  };
  return { deps, store, calls };
};

test("メニューの無い Bsa00101 は入り直す: 記録 → bounce → replace の順", async () => {
  const { deps, store, calls } = mk();
  expect(await reenter(deps)).toBe(true);
  expect(store["mu-m-sso"]).toBe("100000");
  expect(calls).toEqual(["bounce", "/uprx/ShibbolethAuthServlet"]);
});

test("30 秒以内は何もしない。30 秒たてば入り直す", async () => {
  const recent = mk();
  recent.store["mu-m-sso"] = "80000";
  expect(await reenter(recent.deps)).toBe(false);
  expect(recent.calls).toEqual([]);
  expect(shouldReenter({ ...recent.deps, now: 110_000 })).toBe(true);
});

test("ログイン済み・別のパスは入り直さない", () => {
  expect(shouldReenter(mk({ loggedIn: true }).deps)).toBe(false);
  expect(shouldReenter(mk({ pathname: "/uprx/up/pk/pky001/Pky00101.xhtml" }).deps)).toBe(false);
});

test("sessionStorage が使えなければ入り直さない", () => {
  const storage = { getItem: () => { throw new Error("denied"); }, setItem: () => {} };
  expect(shouldReenter(mk({ storage }).deps)).toBe(false);
});
