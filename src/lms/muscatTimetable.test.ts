import { expect, test } from "bun:test";
import { formOf, menuIdOf } from "../../extension/muscatTimetable.js";

const relay = `<html><body><form method="post" id="loginForm" action="/uprx/login.xhtml?a=1&amp;b=2">
<input type="hidden" value='vs&quot;1&#39;' name="jakarta.faces.ViewState">
<input name=plain value=x>
<input value="no-name"><input type="submit" name="go" value="Go">
<input type="checkbox" name="off"><input type="checkbox" name="on" checked value="1">
</form><form id="other"><input name="z" value="9"></form></body></html>`;

test("formOf: 属性の順番・引用符・実体参照・除外", () => {
  expect(formOf(relay, "loginForm")).toEqual({
    action: "/uprx/login.xhtml?a=1&b=2",
    fields: [["jakarta.faces.ViewState", `vs"1'`], ["plain", "x"], ["on", "1"]],
  });
  expect(formOf(relay, "other")!.fields).toEqual([["z", "9"]]);
  expect(formOf(relay, "none")).toBeNull();
});

const home = `<form action="/uprx/up/home.xhtml" id="menuForm"><input name="menuForm" value="menuForm"><ul>
<li><a href="#" id="x" data-pfconfirmcommand="pf.a(&#39;menuForm:mainMenu&#39;,{&#39;menuForm:mainMenu_menuid&#39;:&#39;1fd3614c\\-6ed8\\-45b1\\-96b1\\-29b363ec82cb|1_0_0_0&#39;});"><span>学生時間割表</span></a></li>
<li><a data-pfconfirmcommand="{&#39;menuForm:mainMenu_menuid&#39;:&#39;other|1&#39;}" href="#">出席状況</a></li>
</ul></form>`;

test("menuIdOf: エスケープを外して読む", () => {
  expect(menuIdOf(home, "学生時間割表")).toBe("1fd3614c-6ed8-45b1-96b1-29b363ec82cb|1_0_0_0");
  expect(menuIdOf(home, "出席状況")).toBe("other|1");
  expect(menuIdOf(home, "無い")).toBeNull();
  expect(menuIdOf("<p>x</p>", "学生時間割表")).toBeNull();
});
