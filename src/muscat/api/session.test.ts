import { expect, test } from "bun:test";
import { createSession } from "./session";
import { scanWidgets } from "./virtual/widgets";

const page = (action: string, token: string) =>
  new DOMParser().parseFromString(
    `<form id="menuForm" action="${action}"><input type="hidden" name="rx-token" value="${token}"><input type="hidden" name="jakarta.faces.ViewState" value="vs1"><input type="hidden" name="menuForm:mainMenu_menuid" value=""></form>`,
    "text/html",
  );

const ids = { 学生時間割表: "A|1" };
test("menuRequest は menuForm の action に送り、項目を足す", () => {
  const s = createSession(page("/uprx/up/bs/Bsa00101.xhtml", "t1"), ids);
  const { url, body } = s.menuRequest("学生時間割表");
  expect(url.endsWith("/uprx/up/bs/Bsa00101.xhtml")).toBe(true);
  expect(url.startsWith("http")).toBe(true);
  expect(body.get("rx-token")).toBe("t1");
  expect(body.get("jakarta.faces.ViewState")).toBe("vs1");
  expect(body.get("rx.sync.source")).toBe("menuForm:mainMenu");
  expect(body.get("menuForm:mainMenu")).toBe("menuForm:mainMenu");
  expect(body.get("menuForm:mainMenu_menuid")).toBe("A|1");
});

test("取り込んだ Document(最初の複製・adopt)から script を取り除き、部品の表に移す", () => {
  const withScript = (id: string) =>
    new DOMParser().parseFromString(`<form id="menuForm" action="/m"><span id="${id}">題名</span><script>PrimeFaces.cw("CommandLink","w",{id:"${id}"});</script></form>`, "text/html");
  const s = createSession(withScript("a"), ids);
  expect(s.doc.querySelector("script")).toBeNull();
  expect(s.doc.getElementById("menuForm")!.textContent).toBe("題名");
  const next = withScript("b");
  s.adopt(next);
  expect(next.querySelector("script")).toBeNull();
  expect(scanWidgets(next).has("b")).toBe(true);
});

test("未知のラベルは Error", () => {
  const s = createSession(page("/a", "t"), ids);
  expect(() => s.menuRequest("成績照会")).toThrow(Error);
});

test("adopt で別 Document の action を使う", () => {
  const s = createSession(page("/old.xhtml", "t1"), ids);
  s.adopt(page("/new.xhtml", "t2"));
  const { url, body } = s.menuRequest("学生時間割表");
  expect(url.endsWith("/new.xhtml")).toBe(true);
  expect(body.get("rx-token")).toBe("t2");
});
