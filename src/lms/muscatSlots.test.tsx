import { expect, test } from "bun:test";
import { renderToString } from "react-dom/server";
import type { Timetable } from "@/muscat/api/types";
import { CourseScreen } from "./CourseScreen";
import { CoursesScreen } from "./CoursesScreen";
import { HomeScreen } from "./HomeScreen";
import { placeCourses, todayClasses, type MyCourse } from "./courses";
import { buildSlots, codeOf, getSlots, runs, slotLabel } from "./muscatSlots";

const e = (code: string, day: "月" | "水" | "木", period: number) => ({ day, period, subject: "s", teacher: "", room: "", campus: "", code, credits: 2 });
const tt: Timetable = {
  year: 2026,
  terms: [
    { term: 1, entries: [], credits: null, irregular: [] },
    { term: 2, entries: [], credits: null, irregular: [] },
    { term: 3, entries: [e("5300100001", "水", 4), e("5300100001", "水", 3), e("5300100002", "木", 5)], credits: null, irregular: [{ code: "5300100003", subject: "x", teacher: "", room: "", campus: "", credits: 1 }] },
    { term: 4, entries: [e("5300100002", "木", 5)], credits: null, irregular: [{ code: "5300100003", subject: "x", teacher: "", room: "", campus: "", credits: 1 }] },
  ],
};
const map = buildSlots(tt);
const c = (id: number, code: string, name = "333 授業"): MyCourse => ({ id, name, url: `/c/${id}`, shortname: `2026_${code}` });
const courses = [c(1, "5300100001", "333 二コマ"), c(2, "5300100002", "999 通年"), c(3, "5300100003", "399 不定期"), c(4, "5300999999", "122 対応表に無い")];

test("buildSlots・runs・slotLabel・codeOf", () => {
  expect(map.get("2026_5300100001")).toEqual({ terms: [3], slots: [{ term: 3, day: "水", periods: [3, 4] }] });
  expect(map.get("2026_5300100002")!.terms).toEqual([3, 4]);
  expect(map.get("2026_5300100003")).toEqual({ terms: [3, 4], slots: [] });
  expect(runs([1, 2, 4, 6, 7])).toEqual([[1, 2], [4], [6, 7]]);
  expect(slotLabel(map.get("2026_5300100001")!)).toBe("3学期 水曜 3・4限");
  expect(slotLabel(map.get("2026_5300100002")!)).toBe("3学期・4学期 木曜 5限");
  expect(codeOf("2026_5300100047")).toBe("2026_5300100047");
  // 年度が違えば同じ授業コードでも合わない
  expect(map.get(codeOf("2025_5300100001")!)).toBeUndefined();
  expect(codeOf("deploy3")).toBeNull();
});

test("placeCourses: 2 コマ続き・2 学期・不定期・フォールバック", () => {
  const p3 = placeCourses(courses, 3, map);
  expect(p3.grid["3-3"]).toEqual([{ course: courses[0]!, rows: 2 }]);
  expect([...p3.covered]).toEqual(["3-4"]);
  expect(p3.grid["4-5"]!.map((x) => x.course.id)).toEqual([2]);
  expect(p3.noSlot.map((x) => x.id)).toEqual([3]);
  const p4 = placeCourses(courses, 4, map);
  expect(p4.grid["4-5"]!.map((x) => x.course.id)).toEqual([2]);
  expect(Object.keys(p4.grid)).toEqual(["4-5"]);
  expect(placeCourses(courses, 1, map).grid["2-2"]!.map((x) => x.course.id)).toEqual([4]); // 対応表に無い授業は 3 桁の読み
});

test("todayClasses", () => {
  expect(todayClasses(courses, map, 3, 3).map((x) => x.periods)).toEqual([[3, 4]]);
  expect(todayClasses(courses, map, 3, 1)).toEqual([]);
});

test("getSlots: 拡張の外は null", async () => {
  expect(await getSlots()).toBeNull();
});

test("画面: 表の rowSpan・見出し・今日の授業", () => {
  const t = renderToString(<CoursesScreen initial={courses} now={new Date(2026, 9, 26)} initialSlots={map} />);
  expect(t).toContain('rowSpan="2"');
  expect(t).toContain("不定期");
  const page = { id: 1, name: "999 通年", shortname: "2026_5300100002", teachers: [] };
  expect(renderToString(<CourseScreen page={page} initial={[]} initialSlots={map} />)).toContain("3学期・4学期 木曜 5限");
  const home = (d: Date) => renderToString(<HomeScreen userId={1} initial={{ due: [], news: [], recent: [] }} now={d} initialSlots={map} initialCourses={courses} />);
  const wed = home(new Date(2026, 9, 28));
  for (const s of ["今日の授業", "3・4限 13:10-16:40", "二コマ"]) expect(wed).toContain(s);
  expect(home(new Date(2026, 9, 25))).toContain("今日は授業がありません");
  expect(renderToString(<HomeScreen userId={1} initial={{ due: [], news: [], recent: [] }} initialSlots={null} initialCourses={courses} />)).toContain("読み込み中…");
});
