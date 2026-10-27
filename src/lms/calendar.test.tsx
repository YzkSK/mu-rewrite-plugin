import { expect, test } from "bun:test";
import { renderToString } from "react-dom/server";
import { CalendarScreen } from "./CalendarScreen";
import { monthOf, toMonth } from "./calendar";

const NOW = new Date(2026, 9, 26, 12, 0);
const now = Math.floor(NOW.getTime() / 1000);
const ev = (id: number, name: string, t: number) => ({ id, name, timestart: t, url: `https://x/${id}`, course: { id: 5, fullname: "333 専門" } });
const raw = {
  daynames: ["日", "月", "火", "水", "木", "金", "土"].map((shortname) => ({ shortname })),
  weeks: [
    { prepadding: [0, 1, 2], postpadding: [], days: [1, 2, 3, 4].map((m) => ({ mday: m, istoday: false, events: m === 1 ? [ev(1, "「第1回」の提出期限", now - 86400 * 20), ev(2, "「第2回」の提出期限", now - 86400 * 10)] : m === 2 ? [ev(3, "「第3回」の提出期限", now + 86400)] : [] })) },
    { prepadding: [], postpadding: [0], days: [5, 6, 7, 8, 9, 10].map((m) => ({ mday: m, istoday: m === 6, events: [] })) },
  ],
};
// 2 だけが未提出。1 は提出済みで過去(API の overdue が true でも灰)
const month = toMonth(2026, 10, raw, new Set([2]), now);

test("toMonth: 空き・名前・未提出の期限切れだけ late", () => {
  expect(month.weeks.map((w) => w.length)).toEqual([7, 7]);
  expect(month.weeks[0]!.slice(0, 3)).toEqual([null, null, null]);
  expect(month.weeks[1]![6]).toBeNull();
  const [a, b] = month.weeks[0]![3]!.events;
  expect([a!.name, a!.late, a!.past, b!.late]).toEqual(["第1回", false, true, true]);
  expect(month.weeks[0]![4]!.events[0]).toMatchObject({ late: false, past: false, course: "専門" });
});

test("monthOf: Infinity・範囲外は今の月", () => {
  expect(monthOf("?time=Infinity", NOW)).toEqual({ year: NOW.getFullYear(), month: NOW.getMonth() + 1 });
  expect(monthOf("?time=1e20", NOW)).toEqual({ year: NOW.getFullYear(), month: NOW.getMonth() + 1 });
});

test("monthOf: ?time= から年月、無ければ今", () => {
  expect(monthOf(`?view=month&time=${Math.floor(new Date(2026, 4, 1).getTime() / 1000)}`, NOW)).toEqual({ year: 2026, month: 5 });
  expect(monthOf("", NOW)).toEqual({ year: 2026, month: 10 });
});

test("狭い幅: 予定のある日だけの一覧(両方の形が出る)", () => {
  const h = renderToString(<CalendarScreen initial={month} now={NOW} />);
  for (const t of ["min-[640px]:hidden", "max-[639px]:hidden", "10月1日(木)", "10月2日(金)", "専門"]) expect(h).toContain(t);
  expect(h).not.toContain("10月3日");
  const empty = toMonth(2026, 10, { ...raw, weeks: [] }, new Set(), now);
  expect(renderToString(<CalendarScreen initial={empty} now={NOW} />)).toContain("この月の予定はありません");
  const today = toMonth(2026, 10, { ...raw, weeks: [{ prepadding: [], postpadding: [], days: [{ mday: 4, istoday: true, events: [ev(9, "「第9回」の提出期限", now)] }] }] }, new Set(), now);
  expect(renderToString(<CalendarScreen initial={today} now={NOW} />)).toMatch(/10月4日\(日\)[\s\S]*今日/);
});

test("画面: 題名・色・凡例・今日の丸・コース絞り込み", () => {
  const h = renderToString(<CalendarScreen initial={month} now={NOW} />);
  for (const t of ["2026年10月", "今日", "すべてのコース", "第1回", "期限切れ・未提出", "bg-[#FBEAEA]", "bg-muted", "bg-sidebar-accent", "bg-primary", "title="]) expect(h).toContain(t);
  expect(h).toMatch(/text-error[^>]*>\d\d:\d\d 第2回/);
});
