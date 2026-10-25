import { expect, test } from "bun:test";
import { fakeClient } from "../screens/fakeClient";
import { genericScreen } from "./screens";
import { mountApp, type AppDeps } from "./mountApp";

const page = (top: string, extra = "", menu = true) =>
  new DOMParser().parseFromString(
    `<body>${menu ? '<ul id="menuForm:mainMenu"></ul>' : ""}<div id="wrap"><div id="mainWrapTop">${top}</div>${extra}</div></body>`,
    "text/html",
  );

function setup(over: { restore?: string; bouncing?: boolean; pathname?: string; navFails?: boolean } = {}) {
  const log: string[] = [];
  let onScreen: Parameters<AppDeps["mount"]>[1] = () => {};
  const deps: AppDeps = {
    bg: {
      reportScreen: (l) => void log.push(`report:${l}`),
      askRestore: async () => over.restore ?? "",
      reportBounce: async () => void log.push("bounce"),
      isBouncing: async () => over.bouncing ?? false,
    },
    storage: { getItem: () => null, setItem: () => {} },
    pathname: over.pathname ?? "/uprx/up/pk/pky001/Pky00101.xhtml",
    replace: (u) => void log.push(`replace:${u}`),
    createClient: () =>
      fakeClient({
        navigate: async (l) => {
          log.push(`navigate:${l}`);
          if (over.navFails) throw new Error("x");
        },
      }),
    mount: (_c, cb) => (log.push("mount"), void (onScreen = cb)),
    unblock: () => void log.push("unblock"),
    release: () => void log.push("release"),
    now: () => 1_000_000,
  };
  return { deps, log, fire: (title: string | null, home = false) => onScreen(title === null ? null : genericScreen(title), home) };
}

test("ログイン済み → 描き、画面ができたら題名を記録して覆いを外す(元の画面は動かさない)", async () => {
  const { deps, log, fire } = setup();
  await mountApp(page("[Kmh006] シラバス"), deps);
  expect(log).toEqual(["mount"]);
  fire("シラバス");
  expect(log).toEqual(["mount", "report:シラバス", "release"]);
});

test("ホーム + restore の leaf あり → 先にメニューの POST(navigate)で開いてから描く", async () => {
  const { deps, log } = setup({ restore: "出席確認" });
  await mountApp(page("[Pky001]"), deps);
  expect(log).toEqual(["navigate:出席確認", "mount"]);
});

test("restore で開けなければホームのまま描く。ホーム以外の画面では restore しない", async () => {
  const bad = setup({ restore: "出席確認", navFails: true });
  await mountApp(page("[Pky001]"), bad.deps);
  expect(bad.log).toEqual(["navigate:出席確認", "mount"]);
  const other = setup({ restore: "出席確認" });
  await mountApp(page("[Atb005]"), other.deps);
  expect(other.log).toEqual(["mount"]);
});

test("ホーム(コードなし)は記録を消す。表示できない画面(null)は記録しないが覆いは外す", async () => {
  const { deps, log, fire } = setup();
  await mountApp(page("", '<div id="portalCont"></div>'), deps);
  fire("ホーム", true);
  fire(null);
  expect(log).toEqual(["mount", "report:", "release", "release"]);
});

test("メニューなし + Bsa00101 → bounce して入り直す(覆いは保つ・元の script は止めたまま)", async () => {
  const { deps, log } = setup({ pathname: "/uprx/up/bs/bsa001/Bsa00101.xhtml" });
  await mountApp(page("", "", false), deps);
  expect(log).toEqual(["bounce", "replace:/uprx/ShibbolethAuthServlet"]);
});

test("メニューなしの中継ページ: 元の script を動かし直す。bouncing なら覆いを保ち、そうでなければ外す", async () => {
  const hold = setup({ bouncing: true });
  await mountApp(page("", "", false), hold.deps);
  expect(hold.log).toEqual(["unblock"]);
  const free = setup();
  await mountApp(page("", "", false), free.deps);
  expect(free.log).toEqual(["unblock", "release"]);
});
