import { expect, test } from "bun:test";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { ErrorToast } from "@/ui/Toast";
import { fakeClient } from "./fakeClient";
import { useLiveScreen } from "./useLiveScreen";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

test("読み込みに失敗したら error になり、retry で読み込み中を経て読み直す", async () => {
  let n = 0;
  const read = () => (n++ === 0 ? Promise.reject(new Error("失敗")) : Promise.resolve("page"));
  const client = fakeClient({});
  let live!: ReturnType<typeof useLiveScreen<string>>;
  const Probe = () => {
    live = useLiveScreen(client, read);
    return null;
  };
  await act(async () => createRoot(document.createElement("div")).render(<Probe />));
  expect(live.status).toBe("error");
  await act(async () => void (await live.retry()));
  expect(live.status).toBe("ready");
  expect(live.page).toBe("page");
});

test("画面が出ているときの操作の失敗は、渡した題でトーストに出る", async () => {
  const client = fakeClient({ press: () => Promise.reject(new Error("通信できません")) });
  const read = async () => "page";
  let run!: ReturnType<typeof useLiveScreen<string>>["run"];
  const Probe = () => {
    run = useLiveScreen(client, read, { status: "ready", page: "page" }).run;
    return <ErrorToast />;
  };
  const el = document.createElement("div");
  await act(async () => createRoot(el).render(<Probe />));
  await act(async () => void (await run((c) => c.press("x"), undefined, "検索できませんでした")));
  expect(el.textContent).toContain("検索できませんでした");
});
