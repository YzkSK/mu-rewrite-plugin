import { expect, test } from "bun:test";
import { getZoom } from "./zoom";

test("拡張の外(chrome.storage が無い)では 100%", () => {
  expect(getZoom()).toBe(100);
});
