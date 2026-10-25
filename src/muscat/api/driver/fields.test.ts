import { expect, test } from "bun:test";
import { pickRadio, setChecked, setValue } from "./fields";

const doc = (html: string) => new DOMParser().parseFromString(html, "text/html");

test("setValue: 値が入り input と change が bubbles で飛ぶ", () => {
  const d = doc(`<form><input id="a"></form>`);
  const el = d.getElementById("a") as HTMLInputElement;
  const seen: string[] = [];
  d.body.addEventListener("input", () => seen.push("input"));
  d.body.addEventListener("change", () => seen.push("change"));
  setValue(el, "x");
  expect(el.value).toBe("x");
  expect(seen).toEqual(["input", "change"]);
});

test("setValue: input の処理で前の値に戻されても、入れ直して change を送る", () => {
  const d = doc(`<input id="a" value="2026/10/27">`);
  const el = d.getElementById("a") as HTMLInputElement;
  let atChange = "";
  el.addEventListener("input", () => (el.value = "2026/10/27")); // 日付部品が戻す
  el.addEventListener("change", () => (atChange = el.value));
  setValue(el, "2026/10/28");
  expect([atChange, el.value]).toEqual(["2026/10/28", "2026/10/28"]);
});

test("setChecked: 状態が違うときだけ click", () => {
  const d = doc(`<input id="c" type="checkbox">`);
  const el = d.getElementById("c") as HTMLInputElement;
  let clicks = 0;
  el.addEventListener("click", () => clicks++);
  setChecked(el, false);
  expect(clicks).toBe(0);
  setChecked(el, true);
  expect([clicks, el.checked]).toEqual([1, true]);
  setChecked(el, true);
  expect(clicks).toBe(1);
});

test("pickRadio: name と value で選ぶ。無ければ Error", () => {
  const d = doc(`<input type="radio" name="r" value="1" checked><input type="radio" name="r" value="2">`);
  pickRadio(d, "r", "2");
  expect(d.querySelectorAll<HTMLInputElement>("input")[1]!.checked).toBe(true);
  expect(() => pickRadio(d, "r", "9")).toThrow();
});
