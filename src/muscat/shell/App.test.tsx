import { expect, test } from "bun:test";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { App } from "./App";
import { drawerItems } from "./drawerItems";

const groups = [
  { title: "授業", labels: ["出席確認", "成績照会"] },
  { title: "シラバス", labels: ["シラバス"] },
];
const model = (title: string) => drawerItems({ go() {}, logout() {}, openNative() {} }, groups, title);
const html = (title = "出席確認") =>
  renderToString(<App title={title} model={model(title)} user="太郎">本文</App>);

test("ホーム・全グループ・全項目・固定部分が出る", () => {
  const h = html();
  for (const t of ["ホーム", "授業", "シラバス", "出席確認", "成績照会", "個人設定", "MU ポータルへ", "MU-LMS へ", "ログアウト", "元の画面で開く", "本文", "太郎"]) expect(h).toContain(t);
  expect(h).toContain('aria-label="メニューを開閉"');
});

test("選択中の項目だけ data-active と aria-current が付く", () => {
  const h = html("成績照会");
  expect(h).toMatch(/data-active="true"[^>]*>(?:<span>)?成績照会/);
  expect(h).not.toMatch(/data-active="true"[^>]*>(?:<span>)?出席確認/);
});

test("外部リンクは新しいタブ + noopener、ログアウトは button", () => {
  const h = html();
  expect(h).toMatch(/<a [^>]*href="https:\/\/musashino-u\.myopenlms\.net\/"/);
  expect(h).toContain('target="_blank"');
  expect(h).toContain('rel="noopener noreferrer"');
  expect(h).toMatch(/<button[^>]*>(?:<svg.*?<\/svg>)?ログアウト/);
});

test("☰ を押すと開閉の状態が変わる", async () => {
  const el = document.createElement("div");
  document.body.appendChild(el);
  const root = createRoot(el);
  await act(async () => root.render(<App title="出席確認" model={model("出席確認")}>本文</App>));
  const provider = el.querySelector('[data-slot="sidebar-provider"]')!;
  const before = provider.outerHTML.match(/data-state="(\w+)"/)?.[1];
  await act(async () => el.querySelector<HTMLElement>('[data-slot="sidebar-trigger"]')!.click());
  const after = provider.outerHTML.match(/data-state="(\w+)"/)?.[1];
  expect(before).toBeDefined();
  expect(after).not.toBe(before);
  await act(async () => root.unmount());
});
