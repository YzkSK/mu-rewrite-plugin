import { beforeEach, expect, mock, test } from "bun:test";

mock.module("@/ui/tokens.css?inline", () => ({ default: "" }));
const { mountScreen, unmountScreen } = await import("./screenHost");
const { SCREENS, genericScreen } = await import("./screens");

const menuLink = (label: string) => `<a data-pfconfirmcommand="{'menuForm:mainMenu_menuid':'${label}|1'}">${label}</a>`;
const host = () => document.getElementById("mu-react-host");
const flush = () => new Promise((r) => setTimeout(r, 20));
const text = () => host()?.shadowRoot?.textContent ?? "";

beforeEach(() => {
  unmountScreen();
  document.body.innerHTML = `<p class="loginInfo">武蔵 太郎 さん</p><form id="menuForm">${["学生時間割表", "出席確認", "成績照会"].map(menuLink).join("")}</form>`;
  globalThis.fetch = (() => new Promise(() => {})) as unknown as typeof fetch; // 通信は止めておく
});

test("ScreenDef で mount、unmount で外れる。ユーザー名とシェルの項目が出る", async () => {
  mountScreen(SCREENS.Atb005!, "Atb005");
  await flush();
  expect(host()).not.toBeNull();
  expect(text()).toContain("出席確認");
  expect(text()).toContain("武蔵 太郎");
  for (const l of ["ホーム", "MU ポータルへ", "MU-LMS へ", "ログアウト"]) expect(text()).toContain(l);
  unmountScreen();
  expect(host()).toBeNull();
});

test("key が変わると前の画面を unmount して差し替える", async () => {
  mountScreen(SCREENS.Kmd008!, "Kmd008");
  await flush();
  expect(text()).toContain("学生時間割表");
  mountScreen(SCREENS.Atb005!, "Atb005");
  await flush();
  expect(document.querySelectorAll("#mu-react-host").length).toBe(1);
  expect(text()).toContain("出席確認");
});

test("サイドバーに個人設定が出る。個人設定の画面(Bsa004)では、それが選択中になる", async () => {
  mountScreen(SCREENS.Atb005!, "Atb005");
  await flush();
  expect(text()).toContain("個人設定");
  mountScreen(SCREENS.Bsa004!, "Bsa004");
  await flush();
  const current = [...(host()?.shadowRoot?.querySelectorAll('[aria-current="page"]') ?? [])].map((e) => e.textContent);
  expect(current.some((t) => t?.includes("個人設定"))).toBe(true);
});

test("同じ key の再 mount は何もしない。汎用画面も key で出せる", async () => {
  mountScreen(SCREENS.Atb005!, "Atb005");
  const first = host();
  mountScreen(SCREENS.Atb005!, "Atb005");
  expect(host()).toBe(first);
  mountScreen(genericScreen("ホーム"), "");
  await flush();
  expect(text()).toContain("ホーム");
});
