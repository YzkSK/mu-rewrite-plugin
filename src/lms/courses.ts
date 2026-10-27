import { ajax } from "./api";
import { readSlot } from "./course";
import { codeOf, runs, type SlotMap } from "./muscatSlots";

export type MyCourse = { id: number; name: string; url: string; /** "2026_5300100047" */ shortname?: string };

export const loadCourses = async (): Promise<MyCourse[]> => {
  const d = await ajax<{ courses: { id: number; fullname: string; shortname?: string; viewurl: string }[] }>("core_course_get_enrolled_courses_by_timeline_classification", { classification: "all", limit: 0, offset: 0, sort: "fullname" });
  return d.courses.map((c) => ({ id: c.id, name: c.fullname, url: c.viewurl, shortname: c.shortname }));
};

/** 4-5月=1学期、6-7月=2、8-11月=3、12-3月=4 */
// shortcut: 月からの推定。MUSCAT の時間割には今の学期が無いので、学期の境目は目安
export const termOfMonth = (month: number): number => (month >= 4 && month <= 5 ? 1 : month >= 6 && month <= 7 ? 2 : month >= 8 && month <= 11 ? 3 : 4);

/** rows は縦に何時限分の箱か(2 コマ続きは 2) */
export type Cell = { course: MyCourse; rows: number };

export type Placed = {
  /** キーは `${曜日 1-6}-${時限 1-7}`。箱は始まりの時限に置く */
  grid: Record<string, Cell[]>;
  /** 上の箱に縦に覆われる 2 つ目以降の時限(表では描かない) */
  covered: Set<string>;
  /** 選んだ学期で、曜日か時限の無いコース */
  noSlot: MyCourse[];
  /** 学期も読めないコース(学期に関係なく) */
  other: MyCourse[];
};

const DAY_NO: Record<string, number> = { 月: 1, 火: 2, 水: 3, 木: 4, 金: 5, 土: 6 };

/** 今日(day: 1=月〜6=土)の授業を時限順に。続いた時限は 1 つにまとめる */
export function todayClasses(courses: MyCourse[], slots: SlotMap, term: number, day: number): { course: MyCourse; periods: number[] }[] {
  const out: { course: MyCourse; periods: number[] }[] = [];
  for (const c of courses) {
    const code = codeOf(c.shortname);
    for (const s of (code && slots.get(code)?.slots) || []) {
      if (s.term === term && DAY_NO[s.day] === day) for (const r of runs(s.periods)) out.push({ course: c, periods: r });
    }
  }
  return out.sort((a, b) => a.periods[0]! - b.periods[0]!);
}

/**
 * slots(MUSCAT の対応表)にある授業はそれで置く。対応表が無い・載っていない授業は、コース名の 3 桁(開始の時限だけ)で置く。
 * shortcut: 2 コマ続きの箱が覆う時限に別のコースが重なると、その別のコースは表に出ない(実際の時間割では起きない想定)
 */
export function placeCourses(courses: MyCourse[], term: number, slots: SlotMap | null = null): Placed {
  const p: Placed = { grid: {}, covered: new Set(), noSlot: [], other: [] };
  const put = (c: MyCourse, day: number, periods: number[]) => {
    (p.grid[`${day}-${periods[0]}`] ??= []).push({ course: c, rows: periods.length });
    for (const q of periods.slice(1)) p.covered.add(`${day}-${q}`);
  };
  for (const c of courses) {
    const code = codeOf(c.shortname);
    const cs = code ? slots?.get(code) : undefined;
    if (cs) {
      if (!cs.terms.includes(term)) continue;
      const mine = cs.slots.filter((s) => s.term === term && DAY_NO[s.day]);
      if (!mine.length) p.noSlot.push(c);
      for (const s of mine) for (const r of runs(s.periods)) put(c, DAY_NO[s.day]!, r);
      continue;
    }
    const s = readSlot(c.name);
    if (!s) p.other.push(c);
    else if (s.term !== term) continue;
    else if (s.day === null || s.period === null) p.noSlot.push(c);
    else put(c, s.day, [s.period]);
  }
  return p;
}
