import { expect, test } from "bun:test";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { SupersededError } from "@/muscat/api/errors";
import { useInfoPage } from "./useInfoPage";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

test("画面を離れた印(空のエラー文)のときは、error にせず読み込み中のまま", async () => {
  let info!: ReturnType<typeof useInfoPage>;
  const Probe = () => {
    info = useInfoPage(() => Promise.reject(new SupersededError()));
    return null;
  };
  await act(async () => createRoot(document.createElement("div")).render(<Probe />));
  expect(info.status).toBe("loading");
  expect(info.error).toBeUndefined();
});
