import { expect, test } from "bun:test";
import { createCore } from "./core";
import { MuscatDownError } from "./errors";
import type { Fetch } from "./recover";
import { now } from "./testClock";

const menu = `<form id="menuForm" action="/m"><input name="rx-token" value="t"></form>`;
const doc = () => new DOMParser().parseFromString(menu + "<p>x</p>", "text/html");
const relay = `<form id="loginForm" action="/login"></form>`;


function make(texts: string[]) {
  const calls: string[] = [];
  const f: Fetch = async (url) => {
    calls.push(url);
    return new Response(texts[Math.min(calls.length - 1, texts.length - 1)]);
  };
  return { core: createCore({ fetch: f, doc: doc(), ids: { 出席確認: "A|1" }, now }), calls };
}

test("run は直列: 同時に 2 回呼んでも開始が重ならない", async () => {
  const { core } = make([""]);
  let active = 0;
  let max = 0;
  const op = async () => {
    active++;
    max = Math.max(max, active);
    await new Promise((r) => setTimeout(r, 3));
    active--;
    return 1;
  };
  expect(await Promise.all([core.run(op), core.run(op)])).toEqual([1, 1]);
  expect(max).toBe(1);
});

test("runLive は run と同じ直列キュー。live.doc は渡した doc、op の例外はそのまま出て、次は動く", async () => {
  const { core, calls } = make([""]);
  const order: string[] = [];
  const a = core.runLive(async (l) => {
    await new Promise((r) => setTimeout(r, 5));
    order.push("a");
    return l.doc.body.textContent;
  });
  const b = core.run(async () => (order.push("b"), 1));
  expect(await Promise.all([a, b])).toEqual(["x", 1]);
  expect(order).toEqual(["a", "b"]);
  await expect(core.runLive(async () => { throw new TypeError("boom"); })).rejects.toThrow(TypeError);
  expect(await core.runLive(async () => 2)).toBe(2);
  expect(calls.length).toBe(0);
});

test("喪失 → 復帰 → 一度だけやり直して成功", async () => {
  const { core, calls } = make([relay, menu]);
  let n = 0;
  const v = await core.run(async () => (++n === 1 ? null : "ok"));
  expect(v).toBe("ok");
  expect(n).toBe(2);
  expect(calls.length).toBe(2); // 中継ページ + autoLogin
});

test("やり直しも喪失 → MuscatDownError、op は 2 回まで", async () => {
  const { core } = make([relay, menu]);
  let n = 0;
  await expect(core.run(async () => (n++, null))).rejects.toThrow(MuscatDownError);
  expect(n).toBe(2);
});

test("open: 満たされていれば通信 0 回、満たされなければメニュー POST 1 回", async () => {
  const { core, calls } = make([`${menu}<form id="funcForm"></form>`]);
  const ready = (d: Document) => !!d.getElementById("funcForm");
  const opened = await core.run(async (c) => ((await c.open("出席確認", ready)) ? 1 : null));
  expect(opened).toBe(1);
  expect(calls.length).toBe(1);
  expect(calls[0]!.endsWith("/m")).toBe(true);
  await core.run(async (c) => ((await c.open("出席確認", ready)) ? 1 : null));
  expect(calls.length).toBe(1);
});
