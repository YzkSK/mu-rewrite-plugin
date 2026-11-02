import { expect, test } from "bun:test";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { fakeClient } from "../fakeClient";
import { useMonthEvents } from "./useMonthEvents";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

test("最初の読み込みに失敗したら error に入り、retry で読み直す", async () => {
  let n = 0;
  const read = () => (n++ === 0 ? Promise.reject(new Error("失敗")) : Promise.resolve(["予定"]));
  const client = fakeClient({});
  const today = new Date(2026, 9, 25);
  let m!: ReturnType<typeof useMonthEvents<string>>;
  const Probe = () => {
    m = useMonthEvents(client, read, today);
    return null;
  };
  await act(async () => createRoot(document.createElement("div")).render(<Probe />));
  expect(m.error).toBe("失敗");
  expect(m.events).toEqual([]);
  await act(async () => m.retry());
  expect(m.error).toBeNull();
  expect(m.events).toEqual(["予定"]);
});
