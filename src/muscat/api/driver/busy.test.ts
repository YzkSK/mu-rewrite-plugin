import { expect, test } from "bun:test";
import { isBusy, waitForAjax } from "./busy";

const make = () => {
  const doc = new DOMParser().parseFromString(`<div class="ui-blockui" style="display: none"></div>`, "text/html");
  return { doc, block: doc.querySelector<HTMLElement>(".ui-blockui")! };
};

test("isBusy: display が none 以外で true、ui-helper-hidden があれば false", () => {
  const { doc, block } = make();
  expect(isBusy(doc)).toBe(false);
  block.style.display = "block";
  expect(isBusy(doc)).toBe(true);
  block.classList.add("ui-helper-hidden");
  expect(isBusy(doc)).toBe(false);
});

test("busy になって終わる → done", async () => {
  const { doc, block } = make();
  const p = waitForAjax(doc, { startMs: 100, quietMs: 10, timeoutMs: 500 });
  setTimeout(() => (block.style.display = "block"), 10);
  setTimeout(() => (block.style.display = "none"), 40);
  expect(await p).toBe("done");
});

test("busy にならない → none", async () => {
  const { doc } = make();
  expect(await waitForAjax(doc, { startMs: 30, quietMs: 10 })).toBe("none");
});

test("終わらない → timeout", async () => {
  const { doc, block } = make();
  const p = waitForAjax(doc, { startMs: 100, quietMs: 10, timeoutMs: 60 });
  setTimeout(() => (block.style.display = "block"), 10);
  expect(await p).toBe("timeout");
});
