import { expect, test } from "bun:test";
import { waitForAjax, type ObserveXhr } from "./busy";

const doc = () => new DOMParser().parseFromString(`<div id="w"></div>`, "text/html");
/** 偽の観測: emit で XHR の受信を模擬する */
const fake = () => {
  let on: ((e: { startTime: number }) => void) | undefined;
  const observeXhr: ObserveXhr = (cb) => ((on = cb), () => (on = undefined));
  return { observeXhr, emit: (offset = 0) => on?.({ startTime: performance.now() + offset }), active: () => !!on };
};
const touch = (d: Document) => d.getElementById("w")!.appendChild(d.createElement("p"));

test("XHR 受信 + DOM が静か → done(観測は止まる)", async () => {
  const d = doc();
  const f = fake();
  const p = waitForAjax(d, { observeXhr: f.observeXhr, quietMs: 30 });
  setTimeout(() => f.emit(), 10);
  setTimeout(() => touch(d), 20);
  expect(await p).toBe("done");
  expect(f.active()).toBe(false);
});

test("XHR が先で DOM が遅れて更新 → DOM が静かになるまで待つ", async () => {
  const d = doc();
  const f = fake();
  const t0 = performance.now();
  const p = waitForAjax(d, { observeXhr: f.observeXhr, quietMs: 40 });
  setTimeout(() => f.emit(), 5);
  setTimeout(() => touch(d), 30); // XHR の静かな期間(40ms)の途中で DOM が更新される
  expect(await p).toBe("done");
  expect(performance.now() - t0).toBeGreaterThanOrEqual(65);
});

test("XHR が来ない → none。expectAjax なら startMs が長い", async () => {
  const f = fake();
  const t0 = performance.now();
  expect(await waitForAjax(doc(), { observeXhr: f.observeXhr, startMs: 40 })).toBe("none");
  expect(performance.now() - t0).toBeLessThan(200);
  // 既定: 250ms で none、expectAjax なら 250ms では none にならない
  const r = await Promise.race([waitForAjax(doc(), { observeXhr: f.observeXhr, expectAjax: true, timeoutMs: 400 }), new Promise((res) => setTimeout(() => res("pending"), 350))]);
  expect(r).toBe("pending");
});

test("DOM の変化が止まらない → timeout", async () => {
  const d = doc();
  const f = fake();
  const p = waitForAjax(d, { observeXhr: f.observeXhr, quietMs: 30, timeoutMs: 100 });
  setTimeout(() => f.emit(), 5);
  const iv = setInterval(() => touch(d), 10);
  expect(await p).toBe("timeout");
  clearInterval(iv);
});

test("開始より前の XHR は数えない", async () => {
  const f = fake();
  const p = waitForAjax(doc(), { observeXhr: f.observeXhr, startMs: 40 });
  f.emit(-100);
  expect(await p).toBe("none");
});
