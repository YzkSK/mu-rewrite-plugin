import { afterEach, beforeEach, expect, spyOn, test } from "bun:test";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { subs, useBackClose } from "./useBackClose";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let push: ReturnType<typeof spyOn>;
let back: ReturnType<typeof spyOn>;
let root: Root;
beforeEach(() => {
  push = spyOn(history, "pushState").mockImplementation(() => {});
  back = spyOn(history, "back").mockImplementation(() => {});
  root = createRoot(document.createElement("div"));
});
afterEach(() => {
  act(() => root.unmount());
  push.mockRestore();
  back.mockRestore();
});

function Probe({ open, close }: { open: boolean; close: () => void }) {
  useBackClose(open, close);
  return null;
}
const render = (open: boolean, close: () => void) => act(async () => root.render(<Probe open={open} close={close} />));

test("開くと履歴に積み、戻るで close を呼ぶ(積んだ分は戻さない)", async () => {
  let closed = 0;
  await render(true, () => closed++);
  expect(push).toHaveBeenCalledTimes(1);
  await act(async () => void window.dispatchEvent(new PopStateEvent("popstate", { state: { mu: "screen", label: "ホーム" } })));
  expect(closed).toBe(1);
  await render(false, () => closed++);
  expect(back).not.toHaveBeenCalled();
  expect(subs.open).toBe(0);
});

test("画面の操作で閉じたら history.back() で積んだ分を戻す", async () => {
  await render(true, () => {});
  await render(false, () => {});
  expect(back).toHaveBeenCalledTimes(1);
});

test("開いたままアンマウントしても戻さない", async () => {
  await render(true, () => {});
  await act(async () => root.unmount());
  expect(back).not.toHaveBeenCalled();
  expect(subs.open).toBe(0);
  root = createRoot(document.createElement("div"));
});
