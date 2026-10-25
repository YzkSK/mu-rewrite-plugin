import { expect, test } from "bun:test";
import { getZoom, onZoomChange, setZoom } from "./zoom";

test("選んだ拡大率を覚えて知らせる。選べない値は 100%", () => {
  let calls = 0;
  const off = onZoomChange(() => calls++);
  setZoom(125);
  expect([getZoom(), calls]).toEqual([125, 1]);
  setZoom(90); // 前の版の値など、選べない値は「小」
  expect(getZoom()).toBe(100);
  setZoom(333);
  expect(getZoom()).toBe(100);
  off();
  setZoom(100);
  expect(calls).toBe(3);
});
