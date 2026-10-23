import { afterEach, expect, test } from "bun:test";
import { askRestore, isBouncing, reportBounce, reportScreen } from "./bg";

const g = globalThis as { chrome?: unknown };
afterEach(() => delete g.chrome);

const reply = (r: unknown, lastError?: unknown) => ({
  runtime: { lastError, sendMessage: (_m: unknown, cb: (r: unknown) => void) => cb(r) },
});

test("応答の leaf / on を返す", async () => {
  g.chrome = reply({ leaf: "出席確認", on: true });
  expect(await askRestore()).toBe("出席確認");
  expect(await isBouncing()).toBe(true);
});

test("メッセージの型を送る", () => {
  const sent: unknown[] = [];
  g.chrome = { runtime: { sendMessage: (m: unknown) => sent.push(m) } };
  reportScreen("成績照会");
  expect(sent).toEqual([{ type: "mu-screen", leaf: "成績照会" }]);
});

test("chrome が無い・例外・lastError・空の応答は既定値", async () => {
  expect(await askRestore()).toBe("");
  g.chrome = { runtime: { sendMessage: () => { throw new Error("Extension context invalidated"); } } };
  expect(await isBouncing()).toBe(false);
  await reportBounce();
  g.chrome = reply({ leaf: "x" }, new Error("closed"));
  expect(await askRestore()).toBe("");
  g.chrome = reply(undefined);
  expect(await isBouncing()).toBe(false);
});
