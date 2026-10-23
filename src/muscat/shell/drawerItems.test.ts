import { expect, test } from "bun:test";
import { drawerItems, loginUserOf } from "./drawerItems";

const doc = (html: string) => new DOMParser().parseFromString(html, "text/html");

test("ホームが先頭、個人設定のあとにポータル・LMS・ログアウトが並ぶ", () => {
  const labels = drawerItems(doc(""), ["出席確認", "個人設定"], "MUSCAT").map((i) => i.label);
  expect(labels).toEqual(["ホーム", "出席確認", "個人設定", "MU ポータルへ", "MU-LMS へ", "ログアウト"]);
});

test("今の画面の項目は除く", () => {
  expect(drawerItems(doc(""), ["出席確認"], "ホーム").map((i) => i.label)).not.toContain("ホーム");
});

test("ホームとログアウトは元のヘッダーを click、外部リンクは href", () => {
  const d = doc(`<form id="headerForm"><header><a class="ui-link" id="home"></a></header><button id="headerForm:logoutButton"></button></form>`);
  const hits: string[] = [];
  for (const id of ["home", "headerForm:logoutButton"]) d.getElementById(id)!.addEventListener("click", () => hits.push(id));
  const items = drawerItems(d, [], "x");
  for (const label of ["ホーム", "ログアウト"]) (items.find((i) => i.label === label) as { onSelect(): void }).onSelect();
  expect(hits).toEqual(["home", "headerForm:logoutButton"]);
  expect(items.find((i) => i.label === "MU ポータルへ")).toMatchObject({ href: "https://portal.musashino-u.ac.jp/" });
});

test("ユーザー名は p.loginInfo から。無ければ undefined", () => {
  expect(loginUserOf(doc('<p class="loginInfo"> 武蔵 太郎 さん ようこそ</p>'))).toBe("武蔵 太郎");
  expect(loginUserOf(doc(""))).toBeUndefined();
});
