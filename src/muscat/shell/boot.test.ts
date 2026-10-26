import { afterEach, expect, test } from "bun:test";
import { boot } from "./boot";
import { NATIVE_ENTRY, NATIVE_KEY, muscatMode, openNative } from "./native";

const memory = () => {
  const m = new Map<string, string>();
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), removeItem: (k: string) => void m.delete(k), m };
};
const tick = () => new Promise((r) => setTimeout(r, 10));
const APP = "/uprx/up/bs/bsa001/Bsa00101.xhtml";
const added: Element[] = [];
const stops: (() => void)[] = [];
afterEach(() => {
  added.splice(0).forEach((e) => e.remove());
  stops.splice(0).forEach((s) => s());
});
const run = (pathname: string, storage = memory(), now = 1000) => {
  const { stop, ...r } = boot({ doc: document, pathname, storage, now });
  stops.push(stop);
  return r;
};

/** パーサーが足す元の script を真似て head に足し、type が無効にされたかを見る */
async function blocked(): Promise<boolean> {
  const s = document.createElement("script");
  s.textContent = "window.__native = 1";
  document.head.append(s);
  added.push(s);
  await tick();
  return s.type === "text/x-mu-blocked";
}

test("印が無い /uprx/up/ の読み込みでは、元の script を止める", async () => {
  expect(run(APP)).toEqual({ mode: "app", blocked: true });
  expect(await blocked()).toBe(true);
});

test("「元の画面で開く」の印があれば、止めない(何もしない)", async () => {
  const storage = memory();
  storage.setItem(NATIVE_KEY, "1000");
  expect(run(APP, storage, 5000)).toEqual({ mode: "native", blocked: false });
  expect(await blocked()).toBe(false);
});

test("入口・中継ページ(/uprx/up/ の外)は描くが止めない。/uprx/ の外は何もしない", async () => {
  expect(run(NATIVE_ENTRY, memory(), 1)).toEqual({ mode: "app", blocked: false });
  expect(await blocked()).toBe(false);
  expect(run("/other/", memory(), 1)).toEqual({ mode: "skip", blocked: false });
});

test("印の消し方: 入口の読み込みで、10 秒以内に付けた印は残し、古い印(ポータルから入り直した)は消す。入口以外では消さない", () => {
  const s = memory();
  const hits: string[] = [];
  openNative(s, 1000, (u) => void hits.push(u));
  expect(hits).toEqual([NATIVE_ENTRY]);
  expect(s.getItem(NATIVE_KEY)).toBe("1000");
  expect(muscatMode(NATIVE_ENTRY, s, 5000)).toBe("native"); // 付けた直後の読み込み
  expect(muscatMode(APP, s, 600_000)).toBe("native"); // 元の画面の中の移動では消さない
  expect(muscatMode(NATIVE_ENTRY, s, 600_000)).toBe("app"); // 入り直し → 消えて拡張が働く
  expect(s.getItem(NATIVE_KEY)).toBeNull();
  expect(muscatMode(APP, s, 600_001)).toBe("app");
});

test("sessionStorage が使えなければ印は無いものとして扱う", () => {
  const broken = { getItem: () => { throw new Error("x"); }, setItem: () => {}, removeItem: () => {} };
  expect(muscatMode(APP, broken, 1)).toBe("app");
});
