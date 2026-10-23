import { expect, test } from "bun:test";
import { applyPartialResponse, buildPartialRequest } from "./partial";

const html = `<form id="menuForm" action="/m"><input name="rx-token" value="old"><input name="jakarta.faces.ViewState" value="vs1"></form>
<form id="funcForm" action="/f"><input name="rx-token" value="old"><input name="jakarta.faces.ViewState" value="vs1"><input name="funcForm:nendo_input" value="2026"><p id="body">旧</p></form>`;
const makeDoc = () => new DOMParser().parseFromString(html, "text/html");

const xml = `<?xml version="1.0" encoding="UTF-8"?><partial-response><changes>
<update id="funcForm"><![CDATA[<form id="funcForm" action="/f"><input name="rx-token" value="new"><input name="funcForm:nendo_input" value="2025"><p id="body">新</p></form>]]></update>
<update id="j_id1:jakarta.faces.ViewState:0"><![CDATA[vs2]]></update>
<update id="nothing"><![CDATA[<div>x</div>]]></update>
</changes></partial-response>`;

test("request", () => {
  const form = makeDoc().getElementById("funcForm") as HTMLFormElement;
  const r = buildPartialRequest(form, "funcForm:search", { a: "b" });
  expect(r.body.get("jakarta.faces.partial.ajax")).toBe("true");
  expect(r.body.get("jakarta.faces.source")).toBe("funcForm:search");
  expect(r.body.get("jakarta.faces.partial.execute")).toBe("@all");
  expect(r.body.get("jakarta.faces.partial.render")).toBe("funcForm");
  expect(r.body.get("funcForm:search")).toBe("funcForm:search");
  expect(r.body.get("funcForm:nendo_input")).toBe("2026");
  expect(r.body.get("a")).toBe("b");
  expect(r.headers["Faces-Request"]).toBe("partial/ajax");
  expect(r.headers["Content-Type"]).toBe("application/x-www-form-urlencoded");
});

test("apply: 差し替え・ViewState・menuForm の rx-token", () => {
  const doc = makeDoc();
  applyPartialResponse(doc, xml);
  expect((doc.querySelector("#body") as HTMLElement).textContent).toBe("新");
  const vs = [...doc.querySelectorAll('input[name="jakarta.faces.ViewState"]')] as HTMLInputElement[];
  expect(vs.length).toBeGreaterThan(0);
  expect(vs.every((i) => i.value === "vs2")).toBe(true);
  const tokens = [...doc.querySelectorAll('input[name="rx-token"]')] as HTMLInputElement[];
  expect(tokens.length).toBe(2);
  expect(tokens.every((i) => i.value === "new")).toBe(true);
  expect(doc.getElementById("nothing")).toBeNull();
});
