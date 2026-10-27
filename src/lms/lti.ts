import { courseName } from "@/portal/lib/lms";
import { isShown, loadState, type RawState } from "./course";

export type LtiPage = { id: number | null; courseId: number | null; courseName: string; title: string };
export type Nav = { section: string; prev: { name: string; url: string } | null; next: { name: string; url: string } | null };

const squash = (s: string | null | undefined): string => (s ?? "").replace(/\s+/g, " ").trim();

/** 今開いているページから教材の id・コース・題名を読む。題名は <title> の「<shortname>: 」と「 | MU-LMS」を外したもの */
export function readLtiPage(doc: Document, search: string): LtiPage {
  let courseId: number | null = null;
  for (const s of doc.scripts) {
    const m = /"courseId":(\d+)/.exec(s.textContent ?? "");
    if (m) { courseId = Number(m[1]); break; }
  }
  return {
    id: Number(new URLSearchParams(search).get("id")) || null,
    courseId,
    courseName: courseName(squash(doc.querySelector('.breadcrumb a[href*="/course/view.php"]')?.textContent)),
    title: doc.title.replace(/\s*\|\s*MU-LMS\s*$/, "").replace(/^[^\s:]+:\s*/, "").trim(),
  };
}

/** コースの教材を並び順にして、今の教材の節の名前と前後(ラベル・サブセクション・見えないものは飛ばす) */
export function navOf(state: RawState, cmId: number): Nav | null {
  const cms = new Map(state.cm.map((c) => [String(c.id), c]));
  const sec = state.section.find((s) => s.cmlist.map(String).includes(String(cmId)));
  const list = state.section.flatMap((s) => s.cmlist.map(String))
    .filter((id) => id === String(cmId) || (cms.has(id) && isShown(cms.get(id)!) && !["label", "subsection"].includes(cms.get(id)!.module)));
  const i = list.indexOf(String(cmId));
  if (i < 0 || !sec) return null;
  const at = (id: string | undefined) => { const c = id ? cms.get(id) : undefined; return c ? { name: c.name, url: c.url ?? "" } : null; };
  return { section: sec.title || (sec.number === 0 ? "最初のページ" : `第 ${sec.number} 節`), prev: at(list[i - 1]), next: at(list[i + 1]) };
}

export const loadNav = async (courseId: number, cmId: number): Promise<Nav | null> => navOf(await loadState(courseId), cmId);
