import { courseName } from "@/portal/lib/lms";
import { ajax, LoginRequiredError, shortName } from "./api";
import { isShown, loadState, type RawState } from "./course";
import { loadCourses, type MyCourse } from "./courses";

export type ItemHit = { id: string; name: string; url: string; courseName: string };
export type OtherCourse = { id: number; name: string; teachers: string };
export type SearchResult = { courses: MyCourse[]; items: ItemHit[]; others: OtherCourse[] };

const MAX_ITEMS = 30;
const has = (s: string, q: string): boolean => s.toLowerCase().includes(q.toLowerCase());

/** コースごとの state から、名前に q を含む教材(ラベル・サブセクションは除く)。最大 30 件 */
export function pickItems(states: { course: MyCourse; state: RawState }[], q: string): ItemHit[] {
  const out: ItemHit[] = [];
  for (const { course, state } of states)
    for (const c of state.cm)
      if (out.length < MAX_ITEMS && !["label", "subsection"].includes(c.module) && isShown(c) && has(c.name, q))
        out.push({ id: `${course.id}-${c.id}`, name: c.name, url: c.url ?? "", courseName: courseName(course.name) });
  return out;
}

type RawFound = { id: number; fullname: string; contacts?: { fullname: string }[] };
export const toOthers = (found: RawFound[], mine: MyCourse[]): OtherCourse[] =>
  found.filter((c) => !mine.some((m) => m.id === c.id)).map((c) => ({ id: c.id, name: courseName(c.fullname), teachers: (c.contacts ?? []).map((t) => shortName(t.fullname)).join("、") }));

export async function loadSearch(q: string): Promise<SearchResult> {
  const [mine, found] = await Promise.all([
    loadCourses(),
    ajax<{ courses: RawFound[] }>("core_course_search_courses", { criterianame: "search", criteriavalue: q, page: 0, perpage: 20 }),
  ]);
  const got = await Promise.allSettled(mine.map((course) => loadState(course.id).then((state) => ({ course, state }))));
  if (got.some((g) => g.status === "rejected" && g.reason instanceof LoginRequiredError)) location.reload();
  return {
    courses: mine.filter((c) => has(c.name, q)),
    items: pickItems(got.flatMap((g) => (g.status === "fulfilled" ? [g.value] : [])), q),
    others: toOthers(found.courses, mine),
  };
}
