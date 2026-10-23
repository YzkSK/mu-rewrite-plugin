import { expect, test } from "bun:test";
import { nativeNav } from "./nativeNav";

const doc = (html: string) => new DOMParser().parseFromString(html, "text/html");

test("個人設定: ヘッダーの headerBtn のうち id に commandlink を含まないリンクを click", () => {
  const d = doc(`<form id="headerForm"><nav><a id="h:commandlink1" class="ui-link headerBtn">ログアウト</a><a id="h:set" class="ui-link headerBtn">設定</a></nav></form><form id="menuForm"><a>個人設定</a></form>`);
  const hits: string[] = [];
  d.querySelectorAll("a").forEach((a) => a.addEventListener("click", () => hits.push(a.id || "menu")));
  nativeNav(d, "個人設定");
  expect(hits).toEqual(["h:set"]);
});

test("メニューの項目は #menuForm のリンクを click。無ければ何もしない", () => {
  const d = doc(`<form id="menuForm"><a id="m1"> 出席確認 </a></form>`);
  const hits: string[] = [];
  d.getElementById("m1")!.addEventListener("click", () => hits.push("m1"));
  nativeNav(d, "出席確認");
  nativeNav(d, "存在しない");
  nativeNav(doc(""), "個人設定");
  expect(hits).toEqual(["m1"]);
});
