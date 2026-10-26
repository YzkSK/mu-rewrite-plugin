import { ajax } from "./api";
import { readSlot } from "./course";

export type MyCourse = { id: number; name: string; url: string };

export const loadCourses = async (): Promise<MyCourse[]> => {
  const d = await ajax<{ courses: { id: number; fullname: string; viewurl: string }[] }>("core_course_get_enrolled_courses_by_timeline_classification", { classification: "all", limit: 0, offset: 0, sort: "fullname" });
  return d.courses.map((c) => ({ id: c.id, name: c.fullname, url: c.viewurl }));
};

/** 4-5月=1学期、6-7月=2、8-11月=3、12-3月=4 */
// shortcut: 月からの推定。MUSCAT 連携で正確な学期に替える
export const termOfMonth = (month: number): number => (month >= 4 && month <= 5 ? 1 : month >= 6 && month <= 7 ? 2 : month >= 8 && month <= 11 ? 3 : 4);

export type Placed = {
  /** キーは `${曜日 1-6}-${時限 1-7}` */
  grid: Record<string, MyCourse[]>;
  /** 選んだ学期で、曜日か時限の無いコース */
  noSlot: MyCourse[];
  /** 3 桁が読めないコース(学期に関係なく) */
  other: MyCourse[];
};

export function placeCourses(courses: MyCourse[], term: number): Placed {
  const p: Placed = { grid: {}, noSlot: [], other: [] };
  for (const c of courses) {
    const s = readSlot(c.name);
    if (!s) p.other.push(c);
    else if (s.term !== term) continue;
    else if (s.day === null || s.period === null) p.noSlot.push(c);
    else (p.grid[`${s.day}-${s.period}`] ??= []).push(c);
  }
  return p;
}
