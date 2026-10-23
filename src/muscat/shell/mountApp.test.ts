import { expect, test } from "bun:test";
import { mountApp, type AppDeps } from "./mountApp";

const page = (top: string, extra = "", menu = true) =>
  new DOMParser().parseFromString(
    `<body>${menu ? '<ul id="menuForm:mainMenu"></ul>' : ""}<div id="wrap"><div id="mainWrapTop">${top}</div>${extra}</div></body>`,
    "text/html",
  );

function setup(over: { restore?: string; bouncing?: boolean; pathname?: string; navOk?: boolean } = {}) {
  const log: string[] = [];
  let onChange: (code: string) => void = () => {};
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
    mount: (s, k) => void log.push(`mount:${k}:${s.title}`),
    unmount: () => void log.push("unmount"),
    nav: (_d, l) => (log.push(`nav:${l}`), over.navOk ?? true),
    watch: (_d, cb) => void (onChange = cb),
    release: () => void log.push("release"),
    now: () => 1_000_000,
  };
  return { deps, log, fire: (c: string) => onChange(c) };
}

test("ログイン済みの未登録画面 → 汎用画面が mount され、題名で記録され、覆いが外れる", async () => {
  const { deps, log, fire } = setup();
  const doc = page("[Kmh006] シラバス");
  await mountApp(doc, deps);
  fire("Kmh006");
  expect(log).toEqual(["mount:Kmh006:シラバス", "report:シラバス", "release"]);
});

test("ホーム + restore の leaf あり → nativeNav を呼び、ホームは mount しない(覆いも保つ)", async () => {
  const { deps, log, fire } = setup({ restore: "出席確認" });
  const doc = page("[Pky001]");
  await mountApp(doc, deps);
  fire("Pky001");
  expect(log).toEqual(["nav:出席確認"]);
  fire("Atb005");
  expect(log.slice(1)).toEqual(["mount:Atb005:出席確認", "report:出席確認", "release"]);
});

test("ホーム + restore が空 → ホームを出し、記録を消す", async () => {
  const { deps, log, fire } = setup();
  await mountApp(page("", '<div id="portalCont"></div>'), deps);
  fire("");
  expect(log).toEqual(["mount::ホーム", "report:", "release"]);
});

test("メニューなし + Bsa00101 → bounce して入り直す(覆いは保つ)", async () => {
  const { deps, log } = setup({ pathname: "/uprx/up/bs/bsa001/Bsa00101.xhtml" });
  await mountApp(page("", "", false), deps);
  expect(log).toEqual(["bounce", "replace:/uprx/ShibbolethAuthServlet"]);
});

test("メニューなしの中継ページ: bouncing なら覆いを保ち、そうでなければ外す", async () => {
  const hold = setup({ bouncing: true });
  await mountApp(page("", "", false), hold.deps);
  expect(hold.log).toEqual([]);
  const free = setup();
  await mountApp(page("", "", false), free.deps);
  expect(free.log).toEqual(["release"]);
});
