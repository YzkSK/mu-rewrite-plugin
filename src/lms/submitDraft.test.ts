import { beforeEach, expect, test } from "bun:test";
import type { Node } from "@milkdown/kit/prose/model";
import { load, save, saveDocDraft } from "./submitDraft";

beforeEach(() => sessionStorage.clear());

test("別の利用者の書きかけは読めない", () => {
  save("1", 10, "a");
  expect(load("1", 10)).toBe("a");
  expect(load("2", 10)).toBeNull();
});

test("saveDocDraft は -doc に入れ、古い版の書きかけを消す", () => {
  save("1", 10, "old");
  saveDocDraft("1", 10, { toJSON: () => ({ type: "doc" }) } as Node);
  expect(load("1", "10-doc")).toBe('{"type":"doc"}');
  expect(load("1", 10)).toBeNull();
});
