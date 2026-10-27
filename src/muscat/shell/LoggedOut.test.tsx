import { expect, test } from "bun:test";
import { renderToString } from "react-dom/server";
import { LoggedOut } from "./LoggedOut";

const html = (failed: boolean, syllabusHref: string) => renderToString(<LoggedOut failed={failed} syllabusHref={syllabusHref} onEnter={() => {}} />);

test("ログアウト後: 見出し・ボタン・シラバスのリンク。パスワード欄は無い", () => {
  const h = html(false, "https://x.test/s");
  expect(h).toContain("ログアウトしました");
  expect(h).toContain("MUSCAT に入る");
  expect(h).toContain('href="https://x.test/s"');
  expect(h).toContain("ログインせずにシラバスを見る");
  expect(h).not.toContain("password");
});

test("入れなかったとき見出しが替わる。リンク先が無ければリンクを出さない", () => {
  const h = html(true, "");
  expect(h).toContain("MUSCAT に入れませんでした");
  expect(h).not.toContain("シラバス");
});
