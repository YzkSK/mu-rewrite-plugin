import { expect, test } from "bun:test";
import { syncHidden } from "./syncHidden";

const toDoc = (html: string) => new DOMParser().parseFromString(html, "text/html");
const val = (d: Document, form: string, name: string) =>
  d.querySelector<HTMLInputElement>(`#${form} input[name="${name}"]`)!.value;

test("同じ id のフォームの同じ name の hidden だけを写す", () => {
  const live = toDoc(
    `<form id="a"><input type="hidden" name="vs" value="old"><input type="hidden" name="only" value="keep"><input name="text" value="mine"></form>
     <form id="b"><input type="hidden" name="vs" value="oldB"></form><form id="c"><input type="hidden" name="vs" value="oldC"></form>`,
  );
  const fresh = toDoc(
    `<form id="a"><input type="hidden" name="vs" value="new"><input name="text" value="theirs"></form>
     <form id="b"><input type="hidden" name="vs" value="newB"></form><form id="z"><input type="hidden" name="vs" value="newZ"></form>`,
  );
  syncHidden(live, fresh);
  expect(val(live, "a", "vs")).toBe("new");
  expect(val(live, "a", "only")).toBe("keep");
  expect(val(live, "a", "text")).toBe("mine");
  expect(val(live, "b", "vs")).toBe("newB");
  expect(val(live, "c", "vs")).toBe("oldC");
});

test("only を渡すと、そのフォームだけ写す(ホーム以外の画面では上の段とメニューだけ)", () => {
  const live = toDoc(`<form id="menuForm"><input type="hidden" name="vs" value="old"></form><form id="funcForm"><input type="hidden" name="vs" value="oldF"></form>`);
  const fresh = toDoc(`<form id="menuForm"><input type="hidden" name="vs" value="new"></form><form id="funcForm"><input type="hidden" name="vs" value="newF"></form>`);
  syncHidden(live, fresh, ["headerForm", "menuForm"]);
  expect(val(live, "menuForm", "vs")).toBe("new");
  expect(val(live, "funcForm", "vs")).toBe("oldF");
});
