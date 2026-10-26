import { expect, test } from "bun:test";
import { renderToString } from "react-dom/server";
import { CoursesScreen } from "./CoursesScreen";

const courses = [
  { id: 1, name: "333 専門デプロイメントコースⅢ", url: "https://x/1" },
  { id: 2, name: "399 英語基礎C", url: "https://x/2" },
  { id: 3, name: "ゼミ", url: "https://x/3" },
];

test("今の月の学期の時間割・曜日時限なし・そのほか", () => {
  const h = renderToString(<CoursesScreen initial={courses} now={new Date(2026, 9, 26)} />);
  for (const t of ["3学期", "水", "3限", "専門デプロイメントコースⅢ", "曜日・時限の無いコース", "英語基礎C", "そのほか", "ゼミ", 'href="https://x/1"']) expect(h).toContain(t);
  expect(h).not.toContain("333 ");
});
