import { afterEach, expect, test } from "bun:test";
import { setSesskey } from "./api";
import { groupDue, loadHome, remain, toDue, toNews, toRecent, type Due } from "./home";

const NOW = 1_800_000_000;
const d = (due: number, o: Partial<Due> = {}): Due => ({ name: "n", course: "c", due, overdue: false, canSubmit: true, url: "u", kind: "assign", ...o });

test("toDue: 実機の形を整える", () => {
  expect(toDue({ name: "「中間課題」の提出期限", timesort: 5, overdue: true, url: "https://x/1", course: { fullname: "333 専門デプロイメントコースⅢ" }, modulename: "assign", action: { actionable: false } }))
    .toEqual({ name: "中間課題", course: "専門デプロイメントコースⅢ", due: 5, overdue: true, canSubmit: false, url: "https://x/1", kind: "assign" });
});

test("groupDue: 期限切れは新しい順、今週・先は近い順", () => {
  const g = groupDue([d(NOW + 9 * 86400), d(NOW - 100, { overdue: true }), d(NOW + 3600), d(NOW - 500, { overdue: true }), d(NOW + 8 * 86400)], NOW);
  expect(g.overdue.map((x) => x.due)).toEqual([NOW - 100, NOW - 500]);
  expect(g.week.map((x) => x.due)).toEqual([NOW + 3600]);
  expect(g.later.map((x) => x.due)).toEqual([NOW + 8 * 86400, NOW + 9 * 86400]);
});

test("remain: 日+時間 / 時間+分 / 過去は空", () => {
  expect(remain(NOW + 2 * 86400 + 3 * 3600 + 59, NOW)).toBe("あと 2 日 3 時間");
  expect(remain(NOW + 5 * 3600 + 7 * 60, NOW)).toBe("あと 5 時間 7 分");
  expect(remain(NOW - 1, NOW)).toBe("");
});

test("toNews: 投稿者は姓名、日時は time の datetime、読めなければ null", () => {
  const description = '<time class="x" datetime="2026-09-24T13:13:38+09:00">9月 24日</time><br>2026_0010010109 / アナウンスメント';
  expect(toNews({ title: "碧海　寿広 オオミ　トシヒロ", subTitle: "件名", actionUrl: "https://x/f", description }))
    .toEqual({ subject: "件名", author: "碧海 寿広", at: Date.parse("2026-09-24T13:13:38+09:00"), url: "https://x/f" });
  expect(toNews({ title: "a b", subTitle: "s", actionUrl: "u", description: "<p>x</p>" }).at).toBeNull();
});

test("toRecent", () => {
  expect(toRecent({ id: 3, fullname: "399 英語基礎C", viewurl: "https://x/c" })).toEqual({ id: 3, name: "英語基礎C", url: "https://x/c" });
});

const real = globalThis.fetch;
afterEach(() => { globalThis.fetch = real; });

test("1 つ失敗しても他は返る(失敗した欄は null)", async () => {
  setSesskey("S");
  globalThis.fetch = (async (url: string) => {
    if (url.includes("theme_snap_feed")) return new Response(JSON.stringify([{ error: true, exception: { message: "bad" } }]));
    if (url.includes("core_course_get_recent_courses")) return new Response(JSON.stringify([{ error: false, data: [{ id: 1, fullname: "1 A", viewurl: "u" }] }]));
    return new Response(JSON.stringify([{ error: false, data: { events: [] } }]));
  }) as unknown as typeof fetch;
  expect(await loadHome(1, NOW)).toEqual({ due: [], news: null, recent: [{ id: 1, name: "A", url: "u" }] });
});
