import { expect, test } from "bun:test";
import { drawerItems, lastLoginOf, loginUserOf, type NavActions } from "./drawerItems";

const doc = (html: string) => new DOMParser().parseFromString(html, "text/html");
const groups = [{ title: "授業", labels: ["出席確認", "成績照会"] }];
const hits: string[] = [];
const nav: NavActions = { go: (l) => void hits.push(`go:${l}`), logout: () => void hits.push("logout"), openNative: () => void hits.push("native") };

test("ホーム・グループ別の項目・固定部分が元の並びで出る", () => {
  const m = drawerItems(nav, groups, "MUSCAT");
  expect(m.home.label).toBe("ホーム");
  expect(m.groups.map((g) => [g.title, g.items.map((i) => i.label)])).toEqual([["授業", ["出席確認", "成績照会"]]]);
  expect(m.footer.map((i) => i.label)).toEqual(["個人設定", "MU ポータルへ", "MU-LMS へ", "ログアウト", "元の画面で開く"]);
});

test("今の画面の項目は active(除かない)", () => {
  expect(drawerItems(nav, groups, "出席確認").groups[0]!.items.map((i) => i.active)).toEqual([true, false]);
  expect(drawerItems(nav, groups, "ホーム").home.active).toBe(true);
  expect(drawerItems(nav, groups, "個人設定").footer[0]!.active).toBe(true);
});

test("項目・ホーム・個人設定は画面の移動、ログアウトと元の画面で開くは別の操作、外部リンクは href", () => {
  hits.length = 0;
  const m = drawerItems(nav, groups, "x");
  for (const i of [m.home, m.groups[0]!.items[1]!, m.footer[0]!, m.footer[3]!, m.footer[4]!]) (i as { onSelect(): void }).onSelect();
  expect(hits).toEqual(["go:ホーム", "go:成績照会", "go:個人設定", "logout", "native"]);
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
