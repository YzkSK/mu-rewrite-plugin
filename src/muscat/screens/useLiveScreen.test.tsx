import { expect, test } from "bun:test";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { ErrorToast } from "@/ui/Toast";
import { fakeClient } from "./fakeClient";
import { useLiveScreen } from "./useLiveScreen";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

test("画面が出ているときの操作の失敗は、渡した題でトーストに出る", async () => {
  const client = fakeClient({ driveLive: () => Promise.reject(new Error("通信できません")) });
  const read = async () => "page";
  let run!: ReturnType<typeof useLiveScreen<string>>["run"];
  const Probe = () => {
    run = useLiveScreen(client, read, { status: "ready", page: "page" }).run;
    return <ErrorToast />;
  };
  const el = document.createElement("div");
  await act(async () => createRoot(el).render(<Probe />));
  await act(async () => void (await run([{ kind: "click", ref: "x" }], undefined, "検索できませんでした")));
  expect(el.textContent).toContain("検索できませんでした");
});
