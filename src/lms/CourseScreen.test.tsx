import { expect, test } from "bun:test";
import { renderToString } from "react-dom/server";
import { CourseScreen } from "./CourseScreen";
import type { CoursePage, Item, Section } from "./course";

const NOW = new Date(2026, 9, 27, 12, 0);
const page: CoursePage = { id: 1, name: "333 専門デプロイメントコースⅢ", shortname: "deploy3", teachers: [{ id: 7, name: "碧海 寿広" }] };
const it = (o: Partial<Item>): Item => ({ id: "1", name: "n", url: "https://x/1", mod: "resource", type: null, status: "", html: null, videos: [], ...o });
const sections: Section[] = [
  { id: 1, title: "最初のページ", summary: null, items: [] },
  { id: 2, title: "第1回", summary: "<p>説明文</p>", items: [
    it({ id: "1", name: "課題1", mod: "assign", status: "未提出 2026年10月5日" }),
    it({ id: "2", name: "資料", type: "PDF", status: "未提出 2026年12月5日" }),
    it({ id: "3", name: "", mod: "label", url: "", html: "<p>ラベル本文</p>", videos: ["https://x/a.mp4"] }),
  ] },
  { id: 3, title: "第2回", summary: null, items: [] },
  { id: 4, title: "第3回", summary: null, items: [] },
];
const h = renderToString(<CourseScreen page={page} initial={sections} now={NOW} />);

test("見出し・目次・空の行・先生", () => {
  for (const t of ["3学期 水曜 3限、deploy3", "専門デプロイメントコースⅢ", "元の LMS で開く", "空: 最初のページ・第2回・第3回", "碧海 寿広", 'href="/message/index.php?id=7"', "説明文", "課題", "PDF"]) expect(h).toContain(t);
  expect(h).not.toContain("333 専門");
});

test("ラベルは本文と動画、期日が過去の未提出だけ赤字", () => {
  expect(h).toContain("ラベル本文");
  expect(h).toContain('src="https://x/a.mp4"');
  expect(h).toMatch(/font-bold text-error[^>]*>未提出・10\/5 まで/);
  expect(h).not.toMatch(/font-bold text-error[^>]*>未提出・12\/5 まで/);
});
