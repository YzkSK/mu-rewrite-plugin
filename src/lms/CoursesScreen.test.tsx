import { expect, test } from "bun:test";
import { renderToString } from "react-dom/server";
import { CoursesScreen } from "./CoursesScreen";

const courses = [
  { id: 1, name: "333 専門デプロイメントコースⅢ", url: "https://x/1" },
  { id: 2, name: "399 英語基礎C", url: "https://x/2" },
  { id: 3, name: "ゼミ", url: "https://x/3" },
];

test("狭い幅: 曜日のタブと、2 コマ続きは 1 行", () => {
  const slots = new Map([["2026_5300100047", { terms: [3], slots: [{ term: 3, day: "月", periods: [3, 4] }] }]]);
  const cs = [{ ...courses[0]!, shortname: "2026_5300100047" }];
  const h = renderToString(<CoursesScreen initial={cs} now={new Date(2026, 9, 26)} initialSlots={slots} />);
  for (const t of ["min-[640px]:hidden", "max-[639px]:hidden", 'aria-pressed="true"', "3・4限", "専門デプロイメントコースⅢ"]) expect(h).toContain(t);
  expect(h.match(/3・4限/g)).toHaveLength(1);
  expect(renderToString(<CoursesScreen initial={cs} now={new Date(2026, 9, 27)} initialSlots={slots} />)).toContain("この曜日の授業はありません");
});

test("今の月の学期の時間割・曜日時限なし・そのほか", () => {
  const h = renderToString(<CoursesScreen initial={courses} now={new Date(2026, 9, 26)} />);
  for (const t of ["3学期", "水", "3限", "専門デプロイメントコースⅢ", "曜日・時限の無いコース", "英語基礎C", "そのほか", "ゼミ", 'href="https://x/1"']) expect(h).toContain(t);
  expect(h).not.toContain("333 ");
});
