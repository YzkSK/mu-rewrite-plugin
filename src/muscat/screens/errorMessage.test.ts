import { expect, test } from "bun:test";
import { SupersededError } from "@/muscat/api/errors";
import { errorMessage } from "./errorMessage";

test("fetch の通信失敗(TypeError)は接続の案内、画面を離れた印は空", () => {
  expect(errorMessage(new TypeError("Failed to fetch"))).toContain("通信できませんでした");
  expect(errorMessage(new SupersededError())).toBe("");
});
