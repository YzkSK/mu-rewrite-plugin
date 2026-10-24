import { expect, test } from "bun:test";
import { busyCount, isBusy, subscribeBusy, track } from "./busy";

// ほかのテストが止まったままの通信を残していても動くよう、増減は開始時点との差で見る
test("実行中は +1、終われば戻り、購読者に通知される", async () => {
  const base = busyCount();
  let notified = 0;
  const off = subscribeBusy(() => notified++);
  let release!: () => void;
  const p = track(() => new Promise<number>((r) => (release = () => r(1))));
  expect(busyCount()).toBe(base + 1);
  expect(isBusy()).toBe(true);
  release();
  expect(await p).toBe(1);
  expect(busyCount()).toBe(base);
  expect(notified).toBe(2);
  off();
});

test("例外でも戻る", async () => {
  const base = busyCount();
  await expect(track(async () => { throw new Error("x"); })).rejects.toThrow("x");
  expect(busyCount()).toBe(base);
});

test("入れ子は外側が終わるまで残る", async () => {
  const base = busyCount();
  await track(async () => {
    await track(async () => {});
    expect(busyCount()).toBe(base + 1);
  });
  expect(busyCount()).toBe(base);
});
