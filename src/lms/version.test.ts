import { expect, test } from "bun:test";
import { isNewer } from "../../extension/version.js";

test("isNewer: ドット区切りを数値で比べる(1.10.0 は 1.9.0 より新しい)", () => {
  expect(isNewer("1.10.0", "1.9.0")).toBe(true);
  expect(isNewer("1.0.1", "1.0")).toBe(true);
  expect(isNewer("1.0.0", "1.0.0")).toBe(false);
  expect(isNewer("1.2.0", "1.10.0")).toBe(false);
});
