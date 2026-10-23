import { expect, test } from "bun:test";
import { assignRefs, resolveRef } from "./locator";

const doc = (html: string) => new DOMParser().parseFromString(html, "text/html");

test("操作できる要素に一意の ref が付き、rx- と ViewState は除かれる", () => {
  const d = doc(`<form id="f"><input name="a"><select name="b"></select><textarea></textarea><button>x</button><a onclick="1">l</a><a href="#">no</a>
    <input type="submit"><input name="rx-token"><input name="javax.faces.ViewState"></form>`);
  assignRefs(d);
  const refs = [...d.querySelectorAll("[data-mu-ref]")].map((e) => e.getAttribute("data-mu-ref"));
  expect(refs.length).toBe(6);
  expect(new Set(refs).size).toBe(6);
  expect(d.querySelector('[name="rx-token"]')!.hasAttribute("data-mu-ref")).toBe(false);
  expect(d.querySelector('[name="javax.faces.ViewState"]')!.hasAttribute("data-mu-ref")).toBe(false);
});

test("冪等で、あとから足した要素には続きの番号が付く", () => {
  const d = doc(`<form id="f"><input name="a"></form>`);
  assignRefs(d);
  const first = d.querySelector("input")!.getAttribute("data-mu-ref");
  d.getElementById("f")!.insertAdjacentHTML("beforeend", `<input name="b">`);
  assignRefs(d);
  const [a, b] = [...d.querySelectorAll("input")].map((e) => e.getAttribute("data-mu-ref"));
  expect(a).toBe(first);
  expect(b).not.toBe(first);
});

test("resolveRef: 引ける / 無ければ null", () => {
  const d = doc(`<input name="a">`);
  assignRefs(d);
  const ref = d.querySelector("input")!.getAttribute("data-mu-ref")!;
  expect(resolveRef(d, ref)).toBe(d.querySelector("input"));
  expect(resolveRef(d, "c999")).toBeNull();
  expect(resolveRef(d, '"]x')).toBeNull();
});
