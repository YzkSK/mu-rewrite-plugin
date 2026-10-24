import { expect, test } from "bun:test";
import { readMenuGroups } from "./menuGroups";

test("グループと項目を元の並びで読む。項目の無いグループは除く", () => {
  document.body.innerHTML = `<ul id="menuForm:mainMenu">
    <li class="ui-menuitem ui-menu-parent"><a>授業</a><ul>
      <li class="ui-menuitem"><a> 出席確認 </a></li><li class="ui-menuitem"><a>成績照会</a></li></ul></li>
    <li class="ui-menuitem ui-menu-parent"><a>空</a><ul></ul></li></ul>`;
  expect(readMenuGroups(document)).toEqual([{ title: "授業", labels: ["出席確認", "成績照会"] }]);
});

test("メニューが無ければ空", () => {
  document.body.innerHTML = "";
  expect(readMenuGroups(document)).toEqual([]);
});
