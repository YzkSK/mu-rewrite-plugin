import { afterEach, expect, mock, test } from "bun:test";
import { fakeClient } from "../screens/fakeClient";

mock.module("@/ui/tokens.css?inline", () => ({ default: "" }));
const { mountShell, unmountShell } = await import("./screenHost");

const host = () => document.getElementById("mu-react-host");
const flush = () => new Promise((r) => setTimeout(r, 20));
const text = () => host()?.shadowRoot?.textContent ?? "";

const menu = `<ul id="menuForm:mainMenu"><li class="ui-menuitem ui-menu-parent"><a>授業</a><ul>
  <li class="ui-menuitem"><a>出席確認</a></li><li class="ui-menuitem"><a>成績照会</a></li></ul></li></ul>`;
const page = (code: string, title: string) =>
  new DOMParser().parseFromString(`<body><p class="loginInfo">武蔵 太郎 さん</p>${menu}<div id="wrap"><div id="mainWrapTop">[${code}] ${title}</div></div></body>`, "text/html");

/** 画面の移動は client が持つ Document の入れ替え。navigate は渡した Document に移る */
function setup(first: Document, pages: Record<string, Document> = {}) {
  let shown = { doc: first, seq: 0 };
  const listeners = new Set<() => void>();
  const log: string[] = [];
  const client = fakeClient({
    shown: () => shown,
    subscribe: (l) => (listeners.add(l), () => void listeners.delete(l)),
    navigate: async (label) => {
      log.push(`navigate:${label}`);
      const doc = pages[label];
      if (!doc) throw new Error("x");
      shown = { doc, seq: shown.seq + 1 };
      listeners.forEach((l) => l());
    },
    logout: async () => "/uprx/",
  });
  const actions = { assign: (u: string) => void log.push(`assign:${u}`), openNative: () => void log.push("native") };
  const screens: string[] = [];
  mountShell(client, actions, (s, home) => void screens.push(`${s?.title ?? "-"}:${home}`));
  return { log, screens };
}

afterEach(() => unmountShell());

test("今の画面(client が持つ Document)を描き、ユーザー名・サイドバー・元の画面で開くが出る", async () => {
  const { screens } = setup(page("Atb005", "出席確認"));
  await flush();
  expect(host()).not.toBeNull();
  expect(text()).toContain("出席確認");
  expect(text()).toContain("武蔵 太郎");
  for (const l of ["ホーム", "成績照会", "個人設定", "MU ポータルへ", "MU-LMS へ", "ログアウト", "元の画面で開く"]) expect(text()).toContain(l);
  expect(screens).toEqual(["出席確認:false"]);
  unmountShell();
  expect(host()).toBeNull();
});

test("サイドバーの項目で client.navigate し、移った先の画面に替わる(元の画面は触らない)", async () => {
  const native = page("Atb005", "出席確認");
  const before = native.documentElement.outerHTML;
  const { log, screens } = setup(native, { 成績照会: page("Kmg006", "成績照会") });
  await flush();
  const item = [...(host()?.shadowRoot?.querySelectorAll("a, button") ?? [])].find((e) => e.textContent?.trim() === "成績照会") as HTMLElement;
  item.click();
  await flush();
  expect(log).toEqual(["navigate:成績照会"]);
  expect(screens).toEqual(["出席確認:false", "成績照会:false"]);
  const current = [...(host()?.shadowRoot?.querySelectorAll('[aria-current="page"]') ?? [])].map((e) => e.textContent);
  expect(current.some((t) => t?.includes("成績照会"))).toBe(true);
  expect(native.documentElement.outerHTML).toBe(before);
});

test("移動に失敗したら、画面は替えずにエラーを出す。ログアウトは返った URL へ移る。元の画面で開くは openNative", async () => {
  const { log } = setup(page("Atb005", "出席確認"));
  await flush();
  const click = async (label: string) => {
    ([...(host()?.shadowRoot?.querySelectorAll("a, button") ?? [])].find((e) => e.textContent?.trim().startsWith(label)) as HTMLElement).click();
    await flush();
  };
  await click("成績照会");
  expect(text()).toContain("画面を開けませんでした");
  expect(text()).toContain("出席確認");
  await click("ログアウト");
  await click("元の画面で開く");
  expect(log).toEqual(["navigate:成績照会", "assign:/uprx/", "native"]);
});

test("ホーム(コードなし・#portalCont)は home、表示できない画面は null で案内が出る", async () => {
  const home = new DOMParser().parseFromString(`<body>${menu}<div id="wrap"><div id="portalCont"></div></div></body>`, "text/html");
  expect(setup(home).screens).toEqual(["ホーム:true"]);
  unmountShell();
  const bad = new DOMParser().parseFromString(`<body><p>エラー</p></body>`, "text/html");
  expect(setup(bad).screens).toEqual(["-:false"]);
  await flush();
  expect(text()).toContain("この画面を表示できませんでした");
});
