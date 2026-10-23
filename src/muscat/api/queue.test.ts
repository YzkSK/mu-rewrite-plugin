import { expect, test } from "bun:test";
import { createQueue } from "./queue";

test("同時に投入しても重ならず投入順に完了する", async () => {
  const q = createQueue();
  const log: string[] = [];
  const task = (name: string, ms: number) => () =>
    new Promise<string>((r) => {
      log.push(`start ${name}`);
      setTimeout(() => {
        log.push(`end ${name}`);
        r(name);
      }, ms);
    });
  const res = await Promise.all([q(task("a", 20)), q(task("b", 1)), q(task("c", 1))]);
  expect(res).toEqual(["a", "b", "c"]);
  expect(log).toEqual(["start a", "end a", "start b", "end b", "start c", "end c"]);
});

test("失敗しても次は実行される", async () => {
  const q = createQueue();
  const first = q(() => Promise.reject(new Error("x")));
  const second = q(async () => 2);
  await expect(first).rejects.toThrow("x");
  expect(await second).toBe(2);
});
