import { expect, test } from "bun:test";
import { screenCodeOf } from "./screenCode";

const parse = (html: string) => new DOMParser().parseFromString(`<html><body>${html}</body></html>`, "text/html");

test("mainWrapTop の見出しから画面コードを拾う", () => {
  expect(screenCodeOf(parse('<div id="mainWrapTop">学生時間割表[Kmd008]</div>'))).toBe("Kmd008");
});

test("見出しに無ければ wrap の中から拾う", () => {
  expect(screenCodeOf(parse('<div id="mainWrapTop">見出し</div><div id="wrap">本文[Pky001]</div>'))).toBe("Pky001");
});

test("どこにも無ければ空文字", () => {
  expect(screenCodeOf(parse('<div id="wrap">なし</div>'))).toBe("");
});
