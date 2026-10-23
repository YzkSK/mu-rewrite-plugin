import { beforeEach, expect, mock, test } from "bun:test";

mock.module("@/ui/tokens.css?inline", () => ({ default: "" }));
const { mountScreen, unmountScreen } = await import("./screenHost");

const menuLink = (label: string) => `<a data-pfconfirmcommand="{'menuForm:mainMenu_menuid':'${label}|1'}">${label}</a>`;
const host = () => document.getElementById("mu-react-host");
const flush = () => new Promise((r) => setTimeout(r, 20));
const text = () => host()?.shadowRoot?.textContent ?? "";

beforeEach(() => {
  unmountScreen();
  document.body.innerHTML = `<form id="menuForm">${["学生時間割表", "出席確認", "成績照会"].map(menuLink).join("")}</form>`;
  globalThis.fetch = (() => new Promise(() => {})) as unknown as typeof fetch; // 通信は止めておく
});

test("登録コードで mount、未登録で unmount", async () => {
  mountScreen("Atb005");
  await flush();
  expect(host()).not.toBeNull();
  expect(text()).toContain("出席確認");
  mountScreen("Zzz999");
  expect(host()).toBeNull();
});

test("コードが変わると前の画面を unmount して差し替える", async () => {
  mountScreen("Kmd008");
  await flush();
  expect(text()).toContain("学生時間割表");
  mountScreen("Atb005");
  await flush();
  expect(document.querySelectorAll("#mu-react-host").length).toBe(1);
  expect(text()).toContain("出席確認");
});

test("同じコードの再 mount は何もしない", async () => {
  mountScreen("Atb005");
  const first = host();
  mountScreen("Atb005");
  expect(host()).toBe(first);
});
