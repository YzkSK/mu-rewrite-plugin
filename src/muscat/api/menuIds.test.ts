import { expect, test } from "bun:test";
import { readMenuIds } from "./menuIds";

const cmd = (id: string) =>
  `syncTransition('menuForm:mainMenu');PrimeFaces.addSubmitParam('menuForm',{'menuForm:mainMenu':'menuForm:mainMenu','menuForm:mainMenu_menuid':'${id}'}).submit`;

test("リンクのテキストごとにメニュー ID を返す(\\- を - に戻す)", () => {
  document.body.innerHTML = `<form id="menuForm">
    <a data-pfconfirmcommand="${cmd("aaaa\\-bbbb|1_0_0_0")}">学生時間割表</a>
    <a data-pfconfirmcommand="${cmd("cccc\\-dddd|1_0_0_2")}"> 成績照会 </a>
    <a>属性なし</a></form>`;
  expect(readMenuIds(document)).toEqual({ 学生時間割表: "aaaa-bbbb|1_0_0_0", 成績照会: "cccc-dddd|1_0_0_2" });
});

test("リンクをクリックせず、submit も呼ばない", () => {
  const original = HTMLFormElement.prototype.submit;
  let called = false;
  HTMLFormElement.prototype.submit = () => { called = true; };
  try {
    document.body.innerHTML = `<form id="menuForm"><a data-pfconfirmcommand="${cmd("x|1")}">出席確認</a></form>`;
    document.querySelector("a")!.addEventListener("click", () => { called = true; });
    readMenuIds(document);
    expect(called).toBe(false);
  } finally {
    HTMLFormElement.prototype.submit = original;
  }
});

test("メニューが無い DOM では空のオブジェクト", () => {
  document.body.innerHTML = "<p>no menu</p>";
  expect(readMenuIds(document)).toEqual({});
});
