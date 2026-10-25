import { expect, test } from "bun:test";
import { drawerItems, lastLoginOf, loginUserOf } from "./drawerItems";

const doc = (html: string) => new DOMParser().parseFromString(html, "text/html");
const groups = [{ title: "授業", labels: ["出席確認", "成績照会"] }];

test("ホーム・グループ別の項目・固定部分が元の並びで出る", () => {
  const m = drawerItems(doc(""), groups, "MUSCAT");
  expect(m.home.label).toBe("ホーム");
  expect(m.groups.map((g) => [g.title, g.items.map((i) => i.label)])).toEqual([["授業", ["出席確認", "成績照会"]]]);
  expect(m.footer.map((i) => i.label)).toEqual(["個人設定", "MU ポータルへ", "MU-LMS へ", "ログアウト"]);
});

test("今の画面の項目は active(除かない)", () => {
  expect(drawerItems(doc(""), groups, "出席確認").groups[0]!.items.map((i) => i.active)).toEqual([true, false]);
  expect(drawerItems(doc(""), groups, "ホーム").home.active).toBe(true);
  expect(drawerItems(doc(""), groups, "個人設定").footer[0]!.active).toBe(true);
});

test("ホームとログアウトは元のヘッダーを click、外部リンクは href", () => {
  const d = doc(`<form id="headerForm"><header><a class="ui-link" id="home"></a></header><button id="headerForm:logoutButton"></button></form>`);
  const hits: string[] = [];
  for (const id of ["home", "headerForm:logoutButton"]) d.getElementById(id)!.addEventListener("click", () => hits.push(id));
  const m = drawerItems(d, [], "x");
  for (const i of [m.home, m.footer[3]!]) (i as { onSelect(): void }).onSelect();
  expect(hits).toEqual(["home", "headerForm:logoutButton"]);
  expect(m.footer[1]).toMatchObject({ href: "https://portal.musashino-u.ac.jp/" });
});

test("ユーザー名は p.loginInfo から。無ければ undefined", () => {
  expect(loginUserOf(doc('<p class="loginInfo"> 武蔵 太郎 さん ようこそ</p>'))).toBe("武蔵 太郎");
  expect(loginUserOf(doc(""))).toBeUndefined();
});

test("前回ログインは p.loginInfo の「前回ログイン：」のあと。無ければ undefined", () => {
  expect(lastLoginOf(doc('<p class="loginInfo">佐藤 康樹さん 前回ログイン：2026/10/25 01:29</p>'))).toBe("2026/10/25 01:29");
  expect(lastLoginOf(doc('<p class="loginInfo">佐藤 康樹さん</p>'))).toBeUndefined();
  expect(lastLoginOf(doc(""))).toBeUndefined();
});
