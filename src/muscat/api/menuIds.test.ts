import { expect, test } from "bun:test";
import { readMenuIds } from "./menuIds";

// happy-dom は onclick 属性を実行しないので、同じ動作のリスナーを付ける
function link(id: string, label: string) {
  const a = document.createElement("a");
  a.setAttribute("onclick", "confirmIfModified()");
  a.textContent = label;
  a.addEventListener("click", () => {
    const f = a.closest("form") as HTMLFormElement;
    (f.elements.namedItem("menuForm:mainMenu_menuid") as HTMLInputElement).value = id;
    f.submit();
  });
  return a;
}

test("リンクのテキストごとにメニュー ID を返し、submit は復元される", async () => {
  const original = HTMLFormElement.prototype.submit;
  document.body.innerHTML = `<form id="menuForm"><input type="hidden" name="rx-token" value="t1"><input type="hidden" name="menuForm:mainMenu_menuid" value=""></form>`;
  const form = document.getElementById("menuForm")!;
  form.append(link("A|1", "学生時間割表"), link("B|2", "成績照会"));
  const ids = await readMenuIds(document);
  expect(ids).toEqual({ 学生時間割表: "A|1", 成績照会: "B|2" });
  expect(HTMLFormElement.prototype.submit).toBe(original);
});
