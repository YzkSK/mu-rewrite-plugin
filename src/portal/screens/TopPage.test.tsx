import { expect, test } from "bun:test";
import { renderToString } from "react-dom/server";
import type { TopData } from "../data";
import { TopPage } from "./TopPage";

const NOW = new Date(2026, 9, 27, 12, 0);
const base: TopData = {
  muscatUrl: "https://unipa.m-muscat.musashino-u.ac.jp/uprx/",
  lmsUrl: "https://musashino-u.myopenlms.net/",
  links: [{ href: "https://example.com/a", text: "図書館" }, { href: "https://example.com/b", text: "学生支援" }],
  callout: "MUSCAT稼働時間 <b>8:00-22:00</b>",
  personal: { items: [], count: null },
  news: { items: [{ uuid: "n1", title: "件名A", publish_from: "教務課", publish_start_at: Math.floor(NOW.getTime() / 1000), is_read: false, category: { name: "重要" } }], count: 12 },
  calendar: { header: "学年暦", sources: ["s"], addOutLook: false, first: [] },
  lms: { login: false },
};
const html = (d: Partial<TopData> = {}) => renderToString(<TopPage data={{ ...base, ...d }} loadMonth={async () => []} now={NOW} />);

test("サービス帯: MUSCAT と MU LMS のタイル、スマホ版は出さない、その他リンク", () => {
  const h = html();
  expect(h).toContain("授業・シラバス・掲示");
  expect(h).toContain("課題・教材");
  expect(h).toContain('href="https://unipa.m-muscat.musashino-u.ac.jp/uprx/"');
  expect(h).not.toContain("スマートフォン");
  expect(h).not.toContain("Mobile");
  expect(h).toContain('aria-label="その他リンク"');
  for (const s of ["図書館", "学生支援", "https://example.com/a"]) expect(h).toContain(s);
  expect(h).toContain('role="note"');
  expect(h).toContain("<b>8:00-22:00</b>");
});

test("個人呼出が 0 件なら空の文言", () => {
  expect(html()).toContain("配信されているお知らせはありません");
  expect(html({ personal: null })).toContain("読み込めませんでした");
});

test("大学からのお知らせ: 未読の札・件数・行(開閉ボタン)", () => {
  const h = html();
  for (const s of ["未読 1", "すべて見る(12件)", "件名A", "重要、教務課", 'aria-expanded="false"']) expect(h).toContain(s);
});

test("LMS: 未ログイン・エラー・空・一覧", () => {
  expect(html()).toContain("MU LMS にログインすると表示されます");
  expect(html({ lms: { error: "x" } })).toContain("読み込めませんでした");
  expect(html({ lms: { login: true, events: [] } })).toContain("提出期限の近い課題はありません");
  const due = Math.floor(new Date(2026, 9, 30, 23, 59).getTime() / 1000);
  const h = html({ lms: { login: true, events: [
    { name: "「03_【課題提出先】」の提出期限", course: "399 英語基礎C [Re_a]", due, overdue: false, url: "https://musashino-u.myopenlms.net/mod/assign/view.php?id=1" },
    { name: "古い課題", course: "", due: due - 86400 * 20, overdue: true, url: "https://musashino-u.myopenlms.net/x" },
  ] } });
  for (const s of ["03_【課題提出先】", "英語基礎C [Re_a]", "10/30 23:59", "期限切れ 1"]) expect(h).toContain(s);
  expect(h).not.toContain("399 ");
  expect(h.indexOf("古い課題")).toBeLessThan(h.indexOf("03_【課題提出先】")); // 期限の早い順
});

test("学年暦: 月の操作と凡例", () => {
  const h = html();
  for (const s of ["前の月", "次の月", "2026年10月", "試験・補講", "履修登録"]) expect(h).toContain(s);
});
