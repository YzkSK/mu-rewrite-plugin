import { expect, test } from "bun:test";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { SupersededError } from "@/muscat/api/errors";
import { useKeptLoad } from "./useKeptLoad";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/** 1 回目は "first"、2 回目は渡した失敗で終わる読み込みを描画して、retry で読み直せる形で返す */
async function renderWithSecondFailure(second: Error) {
  let n = 0;
  const load = () => (n++ === 0 ? Promise.resolve("first") : Promise.reject(second));
  let kept!: ReturnType<typeof useKeptLoad<string>>;
  const Probe = () => {
    kept = useKeptLoad(load, []);
    return null;
  };
  await act(async () => createRoot(document.createElement("div")).render(<Probe />));
  await act(async () => kept.retry());
  return kept;
}

test("読み直しに失敗しても、前の結果を残して error にする", async () => {
  const kept = await renderWithSecondFailure(new Error("失敗"));
  expect(kept.status).toBe("error");
  expect(kept.value).toBe("first");
  expect(kept.error).toBeTruthy();
});

test("画面を離れた印(空のエラー文)のときは、error にせず読み込み中のまま", async () => {
  const kept = await renderWithSecondFailure(new SupersededError());
  expect(kept.status).toBe("loading");
  expect(kept.error).toBeUndefined();
});
